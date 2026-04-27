#!/usr/bin/env python3

"""
This script moves all files from "driveIdToPath" (except .obsidian entries, which will be deleted)
to "operations" with "create" flag to be able to recreate the vault on Google Drive
for testing purposes or on sync failures, so you do not need to readd or verify all files manually again.
- Close Obsidian
- Remove the vault on GD completely
- Run script
- Open Obsidian and run Push to Drive
"""

import json
import shutil
import os

def backup_file(filename):
    """Create numbered backup of the file"""
    base_name = filename
    counter = 1
    
    while True:
        backup_name = f"{base_name}.back{counter}"
        if not os.path.exists(backup_name):
            shutil.copy2(filename, backup_name)
            print(f"Backup created: {backup_name}")
            return backup_name
        counter += 1

def process_data_json():
    """Main function to process data.json file"""
    
    # File name
    filename = "data.json"
    
    # Check if file exists
    if not os.path.exists(filename):
        print(f"Error: {filename} not found!")
        return
    
    # Step 1: Create backup
    print("Step 1: Creating backup...")
    backup_file(filename)
    
    # Step 2: Read original data.json
    print(f"\nStep 2: Reading {filename}...")
    with open(filename, 'r') as file:
        data = json.load(file)
    
    # Step 3: Extract driveIdToPath object
    print("\nStep 3: Extracting driveIdToPath object...")
    drive_id_to_path = data.get("driveIdToPath", {})
    print(f"Found {len(drive_id_to_path)} entries in driveIdToPath")
    
    # Step 4: Separate entries based on path
    print("\nStep 4: Separating entries based on path...")
    
    # Find entries to move
    to_move = {}
    
    for _, path in drive_id_to_path.items():
        if not path.startswith(".obsidian"):
            to_move[path] = "create"
            print(f"  Moving: {path} -> operations with 'create'")
    
    # clear driveIdToPath
    data["driveIdToPath"] = {}
    
    # Add moved entries to operations
    data["operations"] = to_move
    
    # Set lastSyncedAt to 0
    data["lastSyncedAt"] = 0
    
    # Write updated data back to original file
    print(f"\nStep 5: Writing updated data to {filename}...")
    with open(filename, 'w') as file:
        json.dump(data, file, indent=2)
    
    print("\n" + "="*50)
    print("Summary:")
    print(f"  - Entries moved to operations: {len(to_move)}")
    print(f"  - lastSyncedAt set to: {data['lastSyncedAt']}")
    print("="*50)

if __name__ == "__main__":
    process_data_json()