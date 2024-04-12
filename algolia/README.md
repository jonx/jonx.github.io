# Restaurant Finder - Algolia Search Demo

## Introduction

This project is a prototype designed to highlight the benefits of an enhanced search experience for a large restaurant reservation website. As per the assignment guidelines, this prototype integrates Algolia's search capabilities with a custom UI to deliver an intuitive and efficient as-you-type search experience.

## Project Setup

Open `index.html` in your browser to view the project.

### Deployment

This project is published on GitHub Pages to allow for easy interaction and evaluation: [Visit Live Demo](https://yourusername.github.io/restaurant-finder/)

## Technical Implementation

### Data Manipulation

The dataset provided was in two separate files: `restaurants_list.json` and `restaurants_info.csv`. A script was developed to merge these files based on the restaurant IDs, ensuring that each entry in the final dataset includes the type of cuisine. This merged dataset was then pushed to an Algolia index for searching.

### Front-End Implementation

- **HTML and CSS**: The layout was constructed to match the client's provided UI mock-up as closely as possible, using modern HTML5 and CSS3 practices. Custom CSS was written to ensure the UI is responsive and accessible.
- **JavaScript**: Algolia JS Helper was utilized to implement an as-you-type search experience, allowing users to search by restaurant name or filter by type of cuisine.
- **Geolocation**: Integration of geolocation API to prioritize restaurants based on the user's current location, with a fallback mechanism for cases where location permissions are not granted.

### Additional Features

- **User Interface Enhancements**: Improvements were made to the original UI/UX design to enhance visual appeal and user interaction based on best practices.
- **Accessibility Features**: Added keyboard navigability and ARIA attributes to improve accessibility.

### Server-Side Features

- **Suggestions**: Autocomplete feature implemented to suggest possible searches to the user.
- **Synonyms**: Configured synonym handling within the Algolia dashboard to ensure robust search results despite varied user input.
- **Events**: Click and conversion tracking was enabled to gather insights into user interactions and preferences.
- **Liked**: Users can like or bookmark restaurants, and this interaction is tracked for personalized recommendations.

## Deliverables

The completed project is hosted on GitHub Pages and can be accessed [here](https://yourusername.github.io/restaurant-finder/). All code and resources are available in this repository, ensuring full transparency and ease of evaluation.

## Conclusion

This project demonstrates the powerful capabilities of Algolia's search API combined with thoughtful front-end development to create a seamless user experience. The enhancements and features implemented go beyond the basic requirements to ensure that the application is both functional and engaging.

Feel free to explore the demo and review the code for a comprehensive understanding of the implementation details. For any queries or further information, please contact me at your-email@example.com.

