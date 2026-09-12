"""
Loads the base VLM and attaches/loads LoRA adapters. Kept as the single
model-loading code path shared by training and serving, so there's never
a mismatch between how a checkpoint was trained and how it's loaded at
inference time.
"""

from peft import LoraConfig, get_peft_model, PeftModel
from transformers import AutoModelForVision2Seq, AutoProcessor

BASE_MODEL_ID = "Qwen/Qwen2.5-VL-7B-Instruct"

LORA_CONFIG = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)


def load_base_model(device: str = "cuda"):
    model = AutoModelForVision2Seq.from_pretrained(BASE_MODEL_ID, torch_dtype="auto").to(device)
    processor = AutoProcessor.from_pretrained(BASE_MODEL_ID)
    return model, processor


def attach_new_lora(model):
    return get_peft_model(model, LORA_CONFIG)


def load_trained_adapter(base_model, adapter_path: str):
    return PeftModel.from_pretrained(base_model, adapter_path)
