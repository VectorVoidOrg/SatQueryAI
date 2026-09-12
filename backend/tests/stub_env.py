"""
tests/stub_env.py

Installs lightweight fakes for torch / transformers / peft / rasterio into
sys.modules so that the REAL satquery_backend/app.py can be imported and
exercised over real HTTP (FastAPI TestClient) on a machine with no GPU.

Nothing here mocks the routing, validation, guardrail, trace or confidence
logic - app.py runs its actual production code paths. Only the model weights,
the CUDA calls and the raster I/O are replaced.

Set env vars before importing to control what the fake model emits:
    FAKE_ANSWER  - the decoded answer string
    FAKE_PROBS   - comma separated per-step chosen-token probabilities
    FAKE_EOS_AT  - step index at which an EOS token appears (stops confidence)
"""
import os
import sys
import types
import contextlib
import numpy as np

VOCAB = 64
EOS_ID = 2


class FakeTensor(np.ndarray):
    """numpy array that also answers the few torch-Tensor calls app.py makes."""

    def float(self):
        return np.asarray(self, dtype=np.float32).view(FakeTensor)

    def to(self, device):
        return self


def _ft(a):
    return np.asarray(a).view(FakeTensor)


class FakeBatch(dict):
    def to(self, device):
        return self


class FakeTokenizer:
    eos_token_id = EOS_ID


class FakeProcessor:
    last_init_kwargs = None   # so tests can assert Task 1 pixel budget

    def __init__(self):
        self.tokenizer = FakeTokenizer()
        self.prompt_len = 37

    def apply_chat_template(self, messages, tokenize=False, add_generation_prompt=True):
        return "<|im_start|>" + str(messages) + "<|im_end|>"

    def __call__(self, text=None, images=None, return_tensors="pt", **kw):
        ids = _ft(np.ones((1, self.prompt_len), dtype=np.int64))
        return FakeBatch({"input_ids": ids, "pixel_values": _ft(np.zeros((len(images), 8)))})

    def batch_decode(self, seqs, skip_special_tokens=True):
        return [os.environ.get("FAKE_ANSWER", "stub answer")]


class FakeGenerateOutput:
    def __init__(self, sequences, scores):
        self.sequences = sequences
        self.scores = scores


class FakeBaseModel:
    def __init__(self):
        self.active = None

    def set_adapter(self, name):
        self.active = name

    def generate(self, **kwargs):
        probs = [float(p) for p in
                 os.environ.get("FAKE_PROBS", "0.9,0.8,0.7").split(",") if p != ""]
        eos_at = os.environ.get("FAKE_EOS_AT")
        eos_at = int(eos_at) if eos_at not in (None, "") else None

        prompt_len = 37
        chosen, scores = [], []
        for step, p in enumerate(probs):
            if eos_at is not None and step == eos_at:
                chosen.append(EOS_ID)
            else:
                chosen.append(step + 10)
            dist = np.full((VOCAB,), 1e-6, dtype=np.float64)
            dist[chosen[-1]] = 1.0
            dist = dist / dist.sum()
            # Scale so softmax(logits)[chosen] == p exactly.
            dist[chosen[-1]] = p
            rest = (1.0 - p) / (VOCAB - 1)
            dist = np.full((VOCAB,), rest, dtype=np.float64)
            dist[chosen[-1]] = p
            scores.append(_ft(np.log(dist)[None, :]))

        # pad with EOS after generation
        seq = np.concatenate(
            [np.ones((1, prompt_len), dtype=np.int64), np.array([chosen], dtype=np.int64)],
            axis=1,
        )
        return FakeGenerateOutput(_ft(seq), tuple(scores))


class FakePeftModel(FakeBaseModel):
    def __init__(self, base):
        super().__init__()
        self.base = base
        self.loaded = []

    def load_adapter(self, path, adapter_name=None):
        self.loaded.append(adapter_name)


def install():
    # ---------------- torch ----------------
    torch = types.ModuleType("torch")
    torch.float16 = "float16"
    torch.float32 = "float32"
    torch.cuda = types.SimpleNamespace(empty_cache=lambda: None, is_available=lambda: True)
    torch.no_grad = lambda: contextlib.nullcontext()
    torch.softmax = lambda x, dim=-1: _ft(np.exp(x - x.max(axis=dim, keepdims=True)) /
                                          np.exp(x - x.max(axis=dim, keepdims=True)).sum(axis=dim, keepdims=True))
    torch.Tensor = FakeTensor
    sys.modules["torch"] = torch

    # ---------------- rasterio ----------------
    rasterio = types.ModuleType("rasterio")
    rasterio.open = lambda *a, **k: (_ for _ in ()).throw(
        RuntimeError("rasterio stub: tests use PNG inputs only"))
    enums = types.ModuleType("rasterio.enums")
    enums.Resampling = types.SimpleNamespace(bilinear="bilinear")
    rasterio.enums = enums
    sys.modules["rasterio"] = rasterio
    sys.modules["rasterio.enums"] = enums

    # ---------------- transformers ----------------
    tf = types.ModuleType("transformers")

    class AutoProcessor:
        @staticmethod
        def from_pretrained(model, **kwargs):
            FakeProcessor.last_init_kwargs = kwargs
            return FakeProcessor()

    class BitsAndBytesConfig:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    class Qwen2_5_VLForConditionalGeneration:
        @staticmethod
        def from_pretrained(model, **kwargs):
            return FakeBaseModel()

    tf.AutoProcessor = AutoProcessor
    tf.BitsAndBytesConfig = BitsAndBytesConfig
    tf.Qwen2_5_VLForConditionalGeneration = Qwen2_5_VLForConditionalGeneration
    sys.modules["transformers"] = tf

    # ---------------- peft ----------------
    peft = types.ModuleType("peft")

    class PeftModel:
        @staticmethod
        def from_pretrained(base, path, adapter_name=None):
            return FakePeftModel(base)

    peft.PeftModel = PeftModel
    sys.modules["peft"] = peft

    return {
        "FakeProcessor": FakeProcessor,
        "FakeBaseModel": FakeBaseModel,
        "FakePeftModel": FakePeftModel,
        "EOS_ID": EOS_ID,
    }
