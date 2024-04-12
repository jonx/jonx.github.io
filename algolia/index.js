function generateStars(starsCount) {
    const totalStars = 5;
    let starsHtml = '';
    for (let i = 1; i <= totalStars; i++) {
        if (i <= starsCount) {
            starsHtml += '<img src="./assets/images/star_full.png" alt="Star" />';
        } else {
            starsHtml += '<img src="./assets/images/star_empty.png" alt="Star" />';
        }
    }
    return starsHtml;
}

function formatNumber(number) {
    if (number < 1000) {
        return number; // return the same number if less than 1000
    }
    return (number / 1000).toFixed(1) + 'K'; // convert to 'K' format
}

var cityCoords = {
    "New York": { lat: 40.7128, lng: -74.0060 },
    "Chicago": { lat: 41.8781, lng: -87.6298 },
    "Houston": { lat: 29.7604, lng: -95.3698 },
    "Phoenix": { lat: 33.4484, lng: -112.0740 }
};

// This is just an example. You might want to use your user IDs from your authentication system.
function generateUserToken() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function fetchUserLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            callback({
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });
        }, function (error) {
            if (error.code === error.PERMISSION_DENIED) {
                // Fallback to IP address-based location
                fetchLocationFromIP(callback);
            }
        });
    } else {
        // Fallback to IP address-based location
        fetchLocationFromIP(callback);
    }
}

$(document).ready(function () {
    console.log("Document ready. Initializing Algolia...");

    // Initialize Algolia with provided credentials and settings
    var client = algoliasearch('FL9NZ1762W', 'f8ba856e44fd9083be46ca297fa0b6cf');
    var helper = algoliasearchHelper(client, 'find_restaurant', {
        disjunctiveFacets: ['food_type', 'neighborhood', 'price_range', 'dining_style'],
        facets: ['state', 'payment_options'], //, 'stars_count'],
        getRankingInfo: true, // Request ranking info to get geo-distance
        hitsPerPage: 10,
        enablePersonalization: true, // Enable personalization
        clickAnalytics: true,
    });

    var suggestionsIndex = client.initIndex('find_restaurant_query_suggestions');

    // Check if a user token already exists; if not, generate a new one and store it
    var userToken = localStorage.getItem('algoliaUserToken');
    if (!userToken) {
        userToken = generateUserToken();
        localStorage.setItem('algoliaUserToken', userToken);
    }

    // Initialize Algolia Insights and set the user token
    window.aa('init', {
        appId: 'FL9NZ1762W',
        apiKey: 'f8ba856e44fd9083be46ca297fa0b6cf',
        useCookie: true,
    });
    aa('setUserToken', userToken);

    helper.toggleFacetRefinement('state', 'open');
    console.log("Excluding closed restaurants by default.");

    // Reacting to search input changes
    $('#search-input').on('input', function () {
        var query = $(this).val();

        if (query.length > 0) {
            $('.suggestions').empty(); // Clear suggestions immediately on input change

            suggestionsIndex.search(query, { hitsPerPage: 5 }).then(({ hits }) => {
                // $('.suggestions').empty(); // TODO: Clear previous suggestions

                // Process each hit to extract suggestions
                hits.forEach(hit => {
                    console.log("Suggestion: ", hit);

                    // Check if 'find_restaurant' and 'exact_matches' exist, and if 'food_type' has entries
                    // TODO: list more of the suggestions types
                    if (hit.find_restaurant && hit.find_restaurant.facets.exact_matches && hit.find_restaurant.facets.exact_matches.food_type.length > 0) {
                        // Loop through each 'food_type' suggestion
                        hit.find_restaurant.facets.exact_matches.food_type.forEach(suggestion => {
                            console.log("Appending suggestion: ", suggestion.value);
                            $('.suggestions').append(`<div class="suggestion">${suggestion.value}</div>`); // Append to class 'suggestions'
                        });
                    }
                });

                // Handle suggestion click
                $('.suggestions').on('click', '.suggestion', function () {
                    var selectedQuery = $(this).text();
                    console.log("Suggestion selected: ", selectedQuery);
                    $('#search-input').val(selectedQuery); // Update the input field with the selected suggestion
                    helper.setQuery(selectedQuery).search(); // Perform the search with the selected suggestion
                    $('.suggestions').empty(); // Clear the suggestions to ensure they don't stick around
                });
            }).catch(err => {
                console.error("Error fetching suggestions: ", err);
            });

            console.log("Searching for: ", query);
            helper.setQuery(query).search();
        } else {
            $('#suggestions').empty(); // Clear suggestions if query is empty
        }
    });

    // Result event callback
    helper.on("result", function (content) {
        console.log("Search results received: ", content);
        try {
            console.log("Attempting to render Hits...");
            // Determine if we are appending based on the page number
            const isAppending = helper.getPage() > 0;
            renderHits(content.results, isAppending);
        } catch (error) {
            console.error("Error rendering Hits: ", error);
        }
        try {
            console.log("Attempting to render Facets...");
            renderFacets(content.results);
        } catch (error) {
            console.error("Error rendering Facets: ", error);
        }
    });

    helper.on('error', function (error) {
        console.error("Algolia search error: ", error);
    });

    // Handle star rating filter click
    $('#stars-filter .star-images').on('click', function() {
        var selectedStars = $(this).data('stars');

        helper.removeNumericRefinement('stars_count'); // Clear existing refinements
        helper.addNumericRefinement('stars_count', '>=', selectedStars).search(); // Apply new refinement
        console.log("Filtering results for " + selectedStars + " or more stars.");
    });

    // Event delegation to monitor click events on facets
    $('#facets').on('click', 'a[data-attribute]', function (e) {
        e.preventDefault();
        const attribute = $(this).data('attribute');
        const value = $(this).data('value');
        helper.toggleFacetRefinement(attribute, value).search();
    });

    $('#location-select').change(function () {
        var selectedLocation = $(this).val();
        
        // Reset location parameters before setting new ones
        helper.setQueryParameter('aroundLatLng', undefined);
        helper.setQueryParameter('aroundLatLngViaIP', false);
    
        if (selectedLocation === "use-current-location") {
            // Use current location or fallback to IP
            helper.setQueryParameter('aroundLatLngViaIP', true);
        } else if (selectedLocation === "no-location" || selectedLocation === "") {
            // No specific location, already reset
        } else {
            var coords = cityCoords[selectedLocation];
            if (coords) {
                // Set specific coordinates for the selected city
                helper.setQueryParameter('aroundLatLng', `${coords.lat}, ${coords.lng}`);
            }
        }
        helper.search(); // Perform the search with the updated location
    });      

    $('#show-more').click(function () {
        helper.nextPage().search();
    });

    // Function to handle Like button clicks
    function handleLikeClick(event) {
        var objectID = $(this).data('objectid').toString(); // Analytics works with strings only
        let queryID = localStorage.getItem("queryID");
        var position = $(this).data('position'); // We're using the hit position in the result instead of just using a hard coded value

        aa('clickedObjectIDsAfterSearch', {
            eventName: 'liked',
            index: 'find_restaurant',
            objectIDs: [objectID],
            positions: [position],
            queryID: queryID,
        });

        // Optionally, visually indicate that the item has been liked
        $(this).addClass('liked'); // TODO

        console.log("Liked restaurant: " + objectID + " in #" + position + "th position.");
    }

    // Attach event listener to Like buttons
    // Note: Since hits are dynamically rendered, use event delegation
    $('#search-results').on('click', '.like-button', handleLikeClick);

    helper.search(); // Trigger initial search to load facets
});

function renderHits(content, append = false) {
    const $hitsContainer = $('#search-results');

    // If not appending, clear previous results
    if (!append) {
        $hitsContainer.empty();
    }

    // Format the number of hits and the processing time, then display the stats
    RenderStats(content); // Insert the stats message into the .search-stats div

    console.log("Render hits: ", content);
    console.log("Store the queryID: ", content.queryID);

    // Write `queryID` to local storage to reuse with click conversion
    localStorage.setItem("queryID", content.queryID);

    if (content.hits.length === 0) {
        // Use no-results template if no hits
        const noResultsHtml = $('#no-results-template').html().replace('{{query}}', helper.state.query);
        $hitsContainer.html(noResultsHtml);
        return;
    }

    // Generate HTML for each hit using the result-template
    const hitsHtml = content.hits.map((hit, index) => {

        let paymentOptionsHtml = hit.payment_options.join(', ');

        // Calculate and format distance
        let distance = hit._rankingInfo && hit._rankingInfo.matchedGeoLocation ? hit._rankingInfo.matchedGeoLocation.distance : null;
        let distanceStr = '';
        if (distance !== null) {
            if (distance < 1000) {
                distanceStr = `${distance} meters away`; // Display in meters if less than 1 km
            } else {
                distanceStr = `${Math.round(distance / 1000)} km away`; // Convert to kilometers and round off if 1 km or more
            }
        }
        console.log("distanceStr: ", distanceStr);

        const starRatingHtml = generateStars(hit.stars_count);
        let templateHtml = $('#result-template').html();
        templateHtml = templateHtml.replace('{{name}}', hit._highlightResult.name.value)
            .replace('{{food_type}}', hit.food_type || 'N/A')
            .replace('{{neighborhood}}', hit.neighborhood || 'N/A')
            .replace('{{stars_count}}', hit.stars_count || 'N/A')
            .replace('{{star_images}}', starRatingHtml)
            .replace('{{price_range}}', hit.price_range || 'N/A')
            .replace('{{payment_options}}', paymentOptionsHtml)
            .replace('{{reviews_count}}', hit.reviews_count)
            .replace('{{distance}}', distanceStr)
            .replace('{{objectID}}', hit.objectID);

        // Add image rendering
        templateHtml = templateHtml.replace('{{image_url_new}}', hit.image_url_new || 'defaultImage.jpg');

        // Include the position as a data attribute for the like button or the hit element itself
        templateHtml = $(templateHtml).find('.like-button').attr('data-position', index + 1).end().prop('outerHTML');

        return templateHtml;
    }).join('');

    $hitsContainer.append(hitsHtml);
}

function RenderStats(content) {
    const formattedHits = formatNumber(content.nbHits);
    const boldText = `${formattedHits} results found`; // Text to be bolded
    const statsMessage = `<strong>${boldText}</strong> in ${content.processingTimeMS}ms`;
    $(".search-stats").html(statsMessage); // Use .html() to parse the HTML tags correctly
}

function renderFacets(content) {
    const $facetsContainer = $('#facets');
    $facetsContainer.empty(); // Clear previous facets

    // Define a mapping from technical names to clean names
    const facetNameMapping = {
        food_type: "Food Type",
        neighborhood: "Neighborhood",
        price_range: "Price Range",
        dining_style: "Dining Style",
        payment_options: "Payment Options",
        state: "State",
    };

    const allFacets = ['food_type', 'neighborhood', 'price_range', 'dining_style', 'payment_options', 'state'];
    const template = $('#facet-template').html(); // Fetch the template once outside the loop

    allFacets.forEach(function (facetName) {
        const facetValues = content.getFacetValues(facetName, { sortBy: ['count:desc', 'name:asc'] });

        if (!facetValues || facetValues.length === 0) {
            return; // Skip this facet if there are no values
        }

        let facetHtml = `<h4>${facetNameMapping[facetName] || facetName}</h4><ul class="facet-list">`;

        facetValues.forEach(function (facetValue) {
            // Create a new instance of the template for each facetValue
            let itemHtml = template
                .replace(/{{facetName}}/g, facetName)
                .replace(/{{valueName}}/g, facetValue.name)
                .replace(/{{count}}/g, facetValue.count)
                .replace(/{{class}}/g, facetValue.isRefined ? 'refined' : '');
            facetHtml += itemHtml; // Append the modified itemHtml directly
        });

        facetHtml += '</ul>';
        $facetsContainer.append(facetHtml);
    });
}


