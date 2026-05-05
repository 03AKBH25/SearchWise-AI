import requests
import os
import datetime
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../.env'))

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/switchwise')
AMFI_HISTORY_URL = "https://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx"

def fetch_nav_for_date(date_obj):
    """
    Fetches NAV data from AMFI for a specific date.
    Date format: DD-Mon-YYYY (e.g., 01-May-2024)
    """
    date_str = date_obj.strftime("%d-%b-%Y")
    print(f"[*] Fetching NAV for {date_str}...")
    
    params = {
        'frmdt': date_str
    }
    
    try:
        response = requests.get(AMFI_HISTORY_URL, params=params, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"[!] Error fetching {date_str}: {e}")
        return None

def parse_amfi_text(text, date_obj):
    """
    Parses the semicolon-separated text from AMFI.
    """
    lines = text.splitlines()
    operations = []
    
    for line in lines:
        line = line.strip()
        if not line or ';' not in line or line.startswith('Scheme Code'):
            continue
            
        parts = line.split(';')
        if len(parts) < 5:
            continue
            
        scheme_code = parts[0].strip()
        try:
            nav = float(parts[4].strip())
        except (ValueError, IndexError):
            continue
            
        if scheme_code and nav:
            operations.append(UpdateOne(
                {'schemeCode': scheme_code, 'date': date_obj},
                {'$set': {'nav': nav}},
                upsert=True
            ))
            
    return operations

def sync_history(days=90):
    client = MongoClient(MONGODB_URI)
    db = client.get_database()
    collection = db.navhistories
    
    today = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    for i in range(days):
        target_date = today - datetime.timedelta(days=i)
        
        # Skip if already exists and has data (optional optimization)
        # For now, we'll just upsert to ensure accuracy
        
        content = fetch_nav_for_date(target_date)
        if not content:
            continue
            
        ops = parse_amfi_text(content, target_date)
        if ops:
            print(f"[+] Found {len(ops)} records. Bulk writing to DB...")
            # Batch operations to avoid large payload errors
            batch_size = 5000
            for j in range(0, len(ops), batch_size):
                batch = ops[j:j + batch_size]
                collection.bulk_write(batch, ordered=False)
            print(f"[OK] Completed {target_date.strftime('%Y-%m-%d')}")
        else:
            print(f"[!] No valid records found for {target_date.strftime('%Y-%m-%d')}")
            
        # Polite delay to avoid hammering the server
        time.sleep(1)

if __name__ == "__main__":
    import sys
    days_to_sync = 90
    if len(sys.argv) > 1:
        try:
            days_to_sync = int(sys.argv[1])
        except ValueError:
            pass
            
    print(f"=== AMFI Historical Sync Started ({days_to_sync} days) ===")
    sync_history(days_to_sync)
    print("=== Sync Completed ===")
