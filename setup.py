#!/usr/bin/env python3

import subprocess
import sys
import secrets
import shutil

BOLD = "\033[1m"
GREEN = "\033[32m"
RED = "\033[31m"
CYAN = "\033[36m"
DIM = "\033[2m"
RESET = "\033[0m"


def info(msg):
    print(f"{CYAN}>{RESET} {msg}")


def ok(msg):
    print(f"{GREEN}✓{RESET} {msg}")


def die(msg):
    print(f"{RED}✗ {msg}{RESET}")
    sys.exit(1)


def heading(msg):
    print(f"\n{BOLD}{msg}{RESET}")


def dim(msg):
    print(f"{DIM}{msg}{RESET}")


def ask(prompt, default=None):
    """Prompt the user for input, showing the default in brackets"""
    if default is not None:
        line = input(f"  {prompt} [{default}]: ").strip()
        return line if line else default
    else:
        line = input(f"  {prompt}: ").strip()
        if not line:
            die(f"'{prompt}' is required.")
        return line


def ask_secret(prompt):
    """Prompt for a secret, generate one if none is provided"""
    print(f"  {prompt}")
    line = input("  Enter secret (leave empty to auto-generate): ").strip()
    if line:
        return line
    generated = secrets.token_hex(32)
    print(f"  Generated secret: {generated}")
    return generated


def run(cmd, *, check=True, capture=False, input_text=None):
    """Run a shell command, Raises on non-zero exit unless check=False"""
    return subprocess.run(
        cmd,
        shell=True,
        check=check,
        capture_output=capture,
        text=True,
        input=input_text,
    )


def require(binary):
    """Abort if a binary is not on PATH"""
    if not shutil.which(binary):
        msg = f"'{binary}' not found on PATH"
        die(msg)

