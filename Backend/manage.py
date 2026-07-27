#!/usr/bin/env python
import os
import sys

def main():
    """Run administrative tasks."""
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'validation_platform.settings')  # ou juste 'validation_platform.settings' si settings est bien importable depuis là
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError("Couldn't import Django.") from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()

