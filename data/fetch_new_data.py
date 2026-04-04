import requests
import json
import pandas as pd
from datetime import datetime

url = "https://ll.thespacedevs.com/2.2.0/launch/?net__gte=2020-08-08T00:00:00Z&limit=100"
all_launches = []

# For rate limiting or limiting overall calls
pages = 0
while url and pages < 15:
    print(f"Fetching page {pages+1}...")
    headers = {'User-Agent': 'dataviz-project/1.0'}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print("Error:", response.status_code, response.text)
        break
    data = response.json()
    all_launches.extend(data['results'])
    url = data.get('next')
    pages += 1

print(f"Total launches fetched: {len(all_launches)}")

# Parse format
# Original date format: Fri Aug 07, 2020 05:12 UTC
def format_date(iso_str):
    if not iso_str:
        return ""
    dt = datetime.strptime(iso_str, "%Y-%m-%dT%H:%M:%SZ")
    return dt.strftime("%a %b %d, %Y %H:%M UTC")

def map_status(status_str):
    status_str = status_str.lower()
    if 'success' in status_str:
        return 'Success'
    elif 'failure' in status_str:
        return 'Failure'
    elif 'partial' in status_str:
        return 'Partial Failure'
    return 'Success' # Default

df_orig = pd.read_csv("Space_Corrected.csv")
max_idx = df_orig["Unnamed: 0"].max() if "Unnamed: 0" in df_orig else len(df_orig)

new_rows = []
for i, launch in enumerate(all_launches):
    idx = max_idx + 1 + i
    
    pad_loc = launch.get('pad', {})
    loc_name = pad_loc.get('location', {}).get('name', 'Unknown') if pad_loc else 'Unknown'
    
    provider = launch.get('launch_service_provider', {})
    provider_name = provider.get('name', 'Unknown') if provider else 'Unknown'
    
    status_mission = map_status(launch.get('status', {}).get('name', ''))
    
    new_rows.append({
        'Unnamed: 0.1': idx,
        'Unnamed: 0': idx,
        'Company Name': provider_name,
        'Location': loc_name,
        'Datum': format_date(launch.get('net', '')),
        'Detail': launch.get('name', ''),
        'Status Rocket': 'StatusActive',
        ' Rocket': '',
        'Status Mission': status_mission
    })

df_new = pd.DataFrame(new_rows)
# Filter out already existing if dates overlap (though we started query from Aug 8)
# Reverse to insert newer at top if we want, or at bottom
df_new = df_new[::-1].reset_index(drop=True)

df_combined = pd.concat([df_orig, df_new], ignore_index=True)
# Save without altering the rest
df_combined.to_csv("Space_Corrected.csv", index=False)
print("Updated `Space_Corrected.csv`. New shape:", df_combined.shape)
