import json
import logging
import re
from urllib.request import urlopen

# Setup basic configuration for logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

restaurants_list_path = 'merged_restaurants.json'
output_path = 'updated_restaurants_with_images.json'

logging.info("Starting the image update process...")

def fetch_new_image_url(page_content):
    # Regular expression to find image URLs ending with .webp or .jpg
    image_url_pattern = re.compile(r'https://resizer\.otstatic\.com/v2/photos/[^.]+?\.(webp|jpg|jpeg)')
    match = image_url_pattern.search(page_content)
    if match:
        # Return the matched URL with its original extension
        return match.group()
    return "https://cdn.otstatic.com/legacy-cw/default2-original.png"

# def fetch_new_image_url(page_content):
#     # We're not handling the edge case where the image has an image external to opentable like this one:
#     # https://www.opentable.com/ichabods-lounge?restId=111058
#     # <img src="https://www.kayak.com/picasso/place?photoreference=ATplDJZBRDKmFeQLXmnctrQxAwrVcwl05bqZ5kdlz3ypx5_jsfn6zHjepeZa8rWSaRXH68LstBs_XGSmGScpwVNGds9vQPM-LapfRm8UF7uoYGM-PsrgAZP90kChyxuaFwLa8tzCcPG6Z2eMU0pMHqtsSVPXPCa-fYcE5iyp_qoyE6yBTMah&amp;caller=opentable-pms-prod-sc&amp;maxheight=720" alt="Ichabod's Lounge, Las Vegas, NV" class="sbo1nca9mYc- MiUu-Hmt5zk-" title="Ichabod's Lounge, Las Vegas, NV" data-test="restaurant-profile-photo" fetchpriority="high">
#     start_marker = 'https://resizer.otstatic.com/v2/photos/wide-huge/'
#     start_index = page_content.find(start_marker)
#     if start_index != -1:
#         end_index = page_content.find('.webp', start_index)
#         if end_index != -1:
#             return page_content[start_index:end_index] + '.jpeg'
#     return "https://cdn.otstatic.com/legacy-cw/default2-original.png"

def check_restaurant_state(page_content):
    if "permanently closed" in page_content.lower():
        return "closed"
    return "open"

def update_image_urls_and_state(restaurants):
    default_image_url = "https://cdn.otstatic.com/legacy-cw/default2-original.png"
    default_state = "unknown"

    for restaurant in restaurants:
        try:
            response = urlopen(restaurant['mobile_reserve_url'])
            page_content = response.read().decode('utf-8')
            restaurant['image_url_new'] = fetch_new_image_url(page_content) or default_image_url
            restaurant['state'] = check_restaurant_state(page_content)
        except Exception as e:
            logging.error(f"Error during request to {restaurant['mobile_reserve_url']}: {e}")
            # Set default values in case of an error
            restaurant['image_url_new'] = default_image_url
            restaurant['state'] = default_state
        finally:
            logging.info(f"ID: {restaurant['objectID']}, state: {restaurant['state']}, New Image URL: {restaurant['image_url_new']}")


try:
    with open(restaurants_list_path, 'r', encoding='utf-8') as file:
        restaurants = json.load(file)
    
    update_image_urls_and_state(restaurants)

    with open(output_path, 'w', encoding='utf-8') as file:
        json.dump(restaurants, file, indent=4)

    logging.info(f"Updated restaurant data with images and state saved to: {output_path}")

except Exception as e:
    logging.error(f"Error processing restaurant images and state: {e}")
