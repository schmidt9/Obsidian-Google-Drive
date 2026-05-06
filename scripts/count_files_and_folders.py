#!/usr/bin/env python3

"""
This script recursively counts all files and directories in vault folder (except .obsidian directory).
Useful to check synced objects count.
"""

from pathlib import Path

def process_data_json():
    """Main function to process data.json file"""

    script_path = Path(__file__).parent.resolve()

    # Get all files recursively excluding .obsidian dir

    vault_root = (script_path / "../../../..").resolve()
    obsidian_dir = (vault_root / ".obsidian").resolve()
    print(f"Counting all files and directories in {vault_root} (except .obsidian directory)")

    paths = []
    dirs_count = 0
    files_count = 0

    for path in Path(vault_root).rglob('*'):
        if not path.is_relative_to(obsidian_dir):
            if path.is_file():
                files_count += 1
            else:
                dirs_count += 1
    
    print("\n" + "="*50)
    print("Summary:")
    print(f"  - Directories count: {dirs_count}")
    print(f"  - Files count:       {files_count}")
    print("="*50)

if __name__ == "__main__":
    process_data_json()