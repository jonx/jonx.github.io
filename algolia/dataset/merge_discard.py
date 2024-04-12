import pandas as pd
import json

print("Merging in progress...")

# Load the JSON data
with open('./restaurants_list.json', encoding='utf-8') as file:
    restaurants_list = json.load(file)

# Load the CSV data
restaurants_info = pd.read_csv('./restaurants_info.csv', delimiter=';', encoding='utf-8')

# Convert JSON data to DataFrame
restaurants_list_df = pd.DataFrame(restaurants_list)

# Merge DataFrames on 'objectID'
merged_data = restaurants_list_df.merge(restaurants_info, on='objectID', how='left')

# Allowed payment options
allowed_payment_options = ["AMEX", "American Express", "Visa", "Discover", "MasterCard"]

# Replace "Diners Club" and "Carte Blanche" with "Discover" and filter allowed payment options
def clean_payment_options(payment_options):
    mapping = {"Diners Club": "Discover", "Carte Blanche": "Discover"}
    return sorted(set([mapping.get(option, option) for option in payment_options if option in allowed_payment_options]))

# Collect all unique payment options before cleaning
all_payment_options = set([option for sublist in restaurants_list_df['payment_options'] for option in sublist])

# Apply the cleaning function to the 'payment_options' column
merged_data['payment_options'] = merged_data['payment_options'].apply(clean_payment_options)

# Calculate discarded payment options
discarded_payment_options = all_payment_options.difference(set(allowed_payment_options)).difference({"Diners Club", "Carte Blanche"})

# Convert merged data back to a list of dictionaries (JSON format)
merged_json_data = merged_data.to_dict(orient='records')

# Save the merged data to a JSON file
merged_json_path = 'merged_restaurants.json'

with open(merged_json_path, 'w', encoding='utf-8') as file:
    json.dump(merged_json_data, file, indent=4)

print("Merged dataset successfully saved to:", merged_json_path)
print("Discarded payment options:", discarded_payment_options)
