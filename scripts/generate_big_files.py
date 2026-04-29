#!/usr/bin/env python3
"""
Script to generate 15 blob files of different size to test batch files upload.
Creates files named blob_01.dat through blob_15.dat
"""

import os
import sys
import time
from pathlib import Path

def generate_blob_file(filename, target_size_mb, chunk_size_mb = 1):
    """
    Generate a blob file of specified size.
    
    Args:
        filename: Output file name
        target_size_mb: Target file size in MB (default: 200)
        chunk_size_mb: Size of each write chunk in MB (default: 10)
    """
    target_bytes = target_size_mb * 1024 * 1024
    chunk_bytes = chunk_size_mb * 1024 * 1024
    chunks_needed = target_size_mb // chunk_size_mb
    remainder_bytes = target_bytes % chunk_bytes
    
    print(f"Creating {filename} ({target_size_mb}MB)...")
    start_time = time.time()
    
    try:
        with open(filename, 'wb') as f:
            # Write data in chunks for better performance
            for i in range(chunks_needed):
                # Generate chunk of random data
                chunk = os.urandom(chunk_bytes)
                f.write(chunk)
                
                # Print progress
                progress = (i + 1) * chunk_size_mb
                if progress % 50 == 0 or progress == target_size_mb:
                    print(f"  Progress: {progress}/{target_size_mb}MB")
            
            # Write remaining bytes if any
            if remainder_bytes > 0:
                remaining_chunk = os.urandom(remainder_bytes)
                f.write(remaining_chunk)
                print(f"  Progress: {target_size_mb}/{target_size_mb}MB")
        
        elapsed_time = time.time() - start_time
        actual_size = os.path.getsize(filename)
        actual_size_mb = actual_size / (1024 * 1024)
        
        print(f"✓ Completed {filename}: {actual_size_mb:.2f}MB in {elapsed_time:.2f} seconds")
        return True
        
    except IOError as e:
        print(f"✗ Error creating {filename}: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error creating {filename}: {e}")
        return False

def main():
    """Main function to generate all blob files."""
    
    output_dir = "./blob_files"
    
    # Create output directory if it doesn't exist
    try:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        print(f"Output directory: {output_dir}")
    except Exception as e:
        print(f"Error creating directory {output_dir}: {e}")
        sys.exit(1)
    
    overall_start = time.time()
    successful = 0

    # key = files count, value = file size in MB
    files = {
        3: 200,
        5: 10,
        15: 1
    }

    for count, file_size in files.items():
        for _ in range(0, count):
            index = successful + 1
            filename = os.path.join(output_dir, f"blob_{index:02d}.dat")

            if generate_blob_file(filename, file_size):
                successful += 1
    
    # Summary
    overall_elapsed = time.time() - overall_start
    print("-" * 60)
    print(f"\n✅ Generation complete!")
    print(f"   Successful: {successful} files")
    print(f"   Total time: {overall_elapsed:.2f} seconds")
    print(f"   Location: {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠ Operation cancelled by user.")
        sys.exit(1)