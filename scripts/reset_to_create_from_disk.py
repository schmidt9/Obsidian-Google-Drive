#!/usr/bin/env python3

"""
This script recursively reads all files and directories from vault folder (except .obsidian directory)
and adds them to "operations" with "create" flag to be able to recreate the vault on Google Drive
for testing purposes or on sync failures, so you do not need to readd or verify all files manually again.
- Close Obsidian
- Remove the vault on GD completely
- Run script
- Open Obsidian and run Push to Drive
"""

import json
import shutil
import os
from pathlib import Path

def backup_file(filepath):
    """Create numbered backup of the file"""
    counter = 1
    
    while True:
        backup_path = f"{filepath}.back{counter}"
        if not os.path.exists(backup_path):
            shutil.copy2(filepath, backup_path)
            print(f"Backup created: {backup_path}")
            return backup_path
        counter += 1

def process_data_json():
    """Main function to process data.json file"""

    script_path = Path(__file__).parent.resolve()

    # Get all files recursively excluding .obsidian dir

    vault_root = (script_path / "../../../..").resolve()
    obsidian_dir = (vault_root / ".obsidian").resolve()
    print(f"Getting all files and directories list in {vault_root}")

    paths = []

    for path in Path(vault_root).rglob('*'):
        if not path.is_relative_to(obsidian_dir):
            rel_path = path.relative_to(vault_root)
            rel_path_str = str(rel_path)
            paths.append(rel_path_str.replace("\\", "/")) # Windows fix
    
    # Backup data.json

    print("\nCreating data.json backup...")

    data_json_path = (script_path / "../data.json").resolve()
    
    if not os.path.exists(data_json_path):
        print(f"Error: {data_json_path} not found!")
        return

    backup_file(data_json_path)
    
    # Read original data.json

    print(f"\nReading {data_json_path}...")

    with open(data_json_path, 'r', encoding='utf-8') as file:
        data = json.load(file)

    # Update data

    operations = {}

    for path in paths:
        operations[path] = "create"
    
    data["operations"] = operations
    data["driveIdToPath"] = {}
    data["lastSyncedAt"] = 0
    
    # Write updated data back to original file

    print(f"\nWriting updated data to {data_json_path}...")

    with open(data_json_path, 'w', encoding='utf-8') as file:
        json.dump(data, file, indent=2, ensure_ascii=False)
    
    print("\n" + "="*50)
    print("Summary:")
    print(f"  - Entries in operations: {len(operations)}")
    print("="*50)

if __name__ == "__main__":
    process_data_json()