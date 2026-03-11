"""
Setup verification script for Aegis Backend
"""
import os
import sys
from pathlib import Path

def check_env_file():
    """Check if .env file exists and has required keys"""
    env_path = Path(".env")
    if not env_path.exists():
        print("❌ .env file not found!")
        print("   Run: cp .env.example .env")
        print("   Then add your GOOGLE_API_KEY")
        return False

    with open(env_path) as f:
        content = f.read()
        if "GOOGLE_API_KEY" not in content:
            print("❌ GOOGLE_API_KEY not found in .env")
            return False
        
        if "your_google_api_key_here" in content or "your_key_here" in content:
            print("❌ Please replace placeholder with actual GOOGLE_API_KEY")
            print("   Get your key from: https://aistudio.google.com/app/apikey")
            return False

    print("✅ .env file configured")
    return True

def check_venv():
    """Check if virtual environment is activated"""
    if sys.prefix == sys.base_prefix:
        print("⚠️ Virtual environment not activated")
        print("   Run: source venv/bin/activate (or venv\\Scripts\\activate on Windows)")
        return False
    print("✅ Virtual environment activated")
    return True

def check_dependencies():
    """Check if required packages are installed"""
    required = [
        'fastapi',
        'uvicorn',
        'websockets',
        'fastmcp',
        'langchain',
        'langchain_google_genai'
    ]

    missing = []
    for package in required:
        try:
            # Handle package name mapping (e.g., langchain-google-genai -> langchain_google_genai)
            __import__(package.replace('-', '_'))
        except ImportError:
            missing.append(package)

    if missing:
        print(f"❌ Missing packages: {', '.join(missing)}")
        print("   Run: pip install -r requirements.txt")
        return False

    print("✅ All dependencies installed")
    return True

def check_structure():
    """Check if all required files exist"""
    required_files = [
        "app/__init__.py",
        "app/main.py",
        "app/simulation/__init__.py",
        "app/simulation/grid.py",
        "app/mcp/__init__.py",
        "app/mcp/drone_server.py",
        "app/websocket/__init__.py",
        "app/websocket/manager.py",
        "app/agent/__init__.py",
        "app/agent/orchestrator.py",
    ]

    missing = []
    for file in required_files:
        if not Path(file).exists():
            missing.append(file)

    if missing:
        print(f"❌ Missing files: {', '.join(missing)}")
        return False

    print("✅ All required files present")
    return True

def main():
    print("🔍 Checking Aegis Backend Setup...\n")

    # Order matters: check structure first to ensure paths exist
    checks = [
        check_structure(),
        check_venv(),
        check_dependencies(),
        check_env_file()
    ]

    print("\n" + "="*50)
    if all(checks):
        print("✅ Setup complete! Ready to run:")
        print("   python -m app.main")
    else:
        print("❌ Setup incomplete. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
