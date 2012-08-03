var tweetGeocoder= {};

tweetGeocoder.geocode = function(tweets, success, failure, finish, searchParameters) {
    // first, create a Google geocoder
    var geocoder = new google.maps.Geocoder();
    // Find the user's location from twitter API
    var userNames = new String();
    var results = tweets.results;
    var global = ((searchParameters) ?searchParameters :{'searchesPerRound': 2, 'searchInterval': 4000});
    console.log('global');
    console.log(global);
    var binarySearch = function(array, keySet, key) {

    var startIndex = 0, stopIndex = array.length - 1, middle = Math.floor((stopIndex + startIndex) / 2);

    while (array[middle][keySet] != key && startIndex < stopIndex) {

        //adjust search area
        if (key < array[middle][keySet]) {
            stopIndex = middle - 1;
        } else if (key > array[middle][keySet]) {
            startIndex = middle + 1;
        }

        //recalculate middle
        middle = Math.floor((stopIndex + startIndex) / 2);
    }

    //make sure it's the right key
    return (array[middle][keySet] != key) ? null : array[middle];
}

    //Number of calls that have not come back
    var outstanding = 0;
    var isSuccess = true;
    var regexp = /\-*\d+[.,]\d+/g; //for ubertwitter and the like
            var geocodeStack = new Array();
            var askGoogle = false;

             if (!results || results.length == 0) {
                console.log('failed'); finish(false);
             } else {
                for ( i = 0; i < results.length; i++) {
                    results[i].waiting = true;
                    results[i].geo_info = {
                        'valid' : false,
                        'exact' : false,
                        'lat' : false,
                        'lng' : false
                    };
                }
             }

       //fork in road
        $.each(results, function(ind, result) {
            if (result.geo) {
                console.log('geotagging ' + result.from_user + ' directly');
                geotagResult(result);
                return;
            }
            if (checkForDuplicateUN(result)) {
                console.log('duplicate of ' + result.from_user);
                return;
            }
            askGoogle = true;
            userNames += result.from_user + ',';
        });
    //initiate long process
        if (askGoogle) {
            getLocations(userNames);
        }
  /*  
    $.ajax('https://api.twitter.com/1/users/lookup.json?screen_name=' + userNames + '&include_entities=false', {
        crossDomain : true,
        dataType : 'jsonp',
        success : function(users) {
            
            
            $.each(users, function(ind, user) {
                // lets create the object with address
                var address = {
                    'address' : user.location
                };
                function callback(outputs, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        success(results[ind], outputs);
                    }
                    else{
                        isSuccess == false;
                    }
                    
                    
                    
                    outstanding--;
                    if (outstanding == 0) {
                        finish(isSuccess);
                    }
                }
                // lets get the geocode information
                outstanding++;
                geocoder.geocode(address, callback);
            });
        },
        
    });
        
*/
       

        

        //initiate long process
        
// 
        // var Result = function(){
            // this.geottag = function(){
//                 
            // };        
        // };
        // //...
        // var myResult = new Result();
        // myResult.geotag();
        
        /**
         * Assigns lat-lng to result in case where this information is specified directly by Twitter
         * @param result with lat-lng recieved from Twitter
         */
        function geotagResult(result) {
            if (result.geo.coordinates[0] == 0 && result.geo.coordinates[1] == 0) {
                console.log('filtering out directly geocoded 0,0 for ' + result.from_user);
                result.waiting = false;
                result.geo_info.exact = true;
                failure(result, null);
                checkIfDone();
                
            } else {
                result.geo_info = {
                    'valid' : true,
                    'exact' : true,
                    'lat' : result.geo.coordinates[0],
                    'lng' : result.geo.coordinates[1],
                    
                };
                success(result, null);
                checkIfDone();
            }
        }

        /**
         * Checks to see if username is already in the process of being geocoded
         */
        function checkForDuplicateUN(result) {
            for ( i = 0; i < results.length; i++) {
                comp_result = results[i];
                if (result == comp_result) {
                    return false;
                }
                if (result.from_user == comp_result.from_user && !comp_result.geo_info.exact) {
                    result.geo_info = comp_result.geo_info;
                    //probably meaningless, but could apply to super-fast call on super-slow computer
                    return true;
                }
            }
            return false;
        }

        //LEVEL 1 ASYNC FUNCTION

        /**
         * Checks for the locations of all outstanding usernames at once, then geocodes them
         */
        function getLocations(userNames) {

            
            console.log('https://api.twitter.com/1/users/lookup.json?screen_name=' + userNames + '&include_entities=false');
            //TODO: Implement this after app is registered
            // $.ajax('https://api.twitter.com/1/users/lookup.json', {
            // type: "POST",
            // dataType: 'application/json',
            // data:{
            // 'screen_name': userNames
            // },
            $.ajax('https://api.twitter.com/1/users/lookup.json?screen_name=' + userNames + '&include_entities=false', {
                crossDomain : true,
                dataType : 'jsonp',
                timeout : 15000,
                //TODO: Handle 400's better
                error : function() {console.log('lookup api failure'); finish(false);},
                success : function(users) {

                    $.each(users, function(ind, user) {
                        geocodeUser(user);
                    });

                    executeGeocodeTimer();

                }
            });

            function executeGeocodeTimer() {

                console.log('geocodeStack length: ' + geocodeStack.length);

                var size = global.searchesPerRound;
                var startOfRound = 0;

                makeRound();

                function makeRound() {

                    var increment = Math.min(size, geocodeStack.length - startOfRound);

                    console.log('startOfRound at beggining of for: ' + startOfRound);

                    for (var i = startOfRound; i < startOfRound + increment; i++) {
                        useGoogle(geocodeStack[i]);
                    }

                   

                    startOfRound += increment;
                    console.log('startOfRound at end of for: ' + startOfRound);

                    //rezoom at interval
                    

                    //recursively make another round, waiting b/c of timer limits
                    if (startOfRound < geocodeStack.length) {
                        console.log('setting timeout');
                        setTimeout(makeRound, global.searchInterval);
                    }

                }

            }

            //LEVEL 2 ASYNC FUNCTION

            /**
             * If necessary, requests lat-lng from Google and handles response
             */
            function geocodeUser(user) {

                console.log('user location: ' + user.location);

                if (!(user.location == null)) {

                    if (!(user.location.replace(/\s/g) == '')) {

                        if ((user.location.search(regexp) == -1) ? false : (user.location.match(regexp).length != 2) ? false : (user.location.match(regexp)[0] >= -90 && user.location.match(regexp)[0] <= 90 && user.location.match(regexp)[1] >= -180 && user.location.match(regexp)[1] <= 180)) {

                            //ubertwitter and the like
                            gotCoords(user.screen_name, user.location.match(regexp)[0], user.location.match(regexp)[1]);

                        } else if (/^\d{3}$/i.test(user.location) || /^\d{3}\D/i.test(user.location) || /\D\d{3}$/i.test(user.location) || /\D\d{3}\D/i.test(user.location)) {

                            //handle area codes
                            var found = binarySearch(area_codes, 'area_code', user.location.match(/\d{3}/)[0]);
                            
                            if (found != null) {
                                gotCoords(user.screen_name, found.lat, found.lng);
                            } else {
                                geocodeStack.push(user);
                            }

                        } else {

                            //plain old location
                            geocodeStack.push(user);

                        }

                    } else {
                        didNotGetCoords(user.screen_name);
                    }

                } else {
                    didNotGetCoords(user.screen_name);
                }

            }

        }

        //SYNCHRONOUS FUNCTIONS CALLED AT LEVEL 2

        /**
         * Assigns lat-lng to Tweet and any with duplicate user names
         * @param userName name of user for whom coordinates have been found
         * @param lat coordinate latitude
         * @param lng coordinate longitude
         */
        function gotCoords(userName, lat, lng, googleObj) {

            //filter out 0,0
            if ( lat == 0 && lng == 0) {
                console.log('Filtering out 0,0 for ' + userName);
                didNotGetCoords(userName);
            } else {
                $.each(results, function() {

                    if (!this.waiting) {
                        return;
                    }
                    console.log('gotCoords from_user, userName');
                    console.log(this.from_user);
                    console.log(userName);
                    
                    if (this.from_user == userName) {

                        this.geo_info.valid = true;
                        this.geo_info.lat = lat;
                        this.geo_info.lng = lng;
                        this.waiting = false;
                        if(!googleObj){
                            success(this, null);
                            checkIfDone();
                        } else {
                            success(this, googleObj);
                            checkIfDone();
                        }
                    }

                });
            }

        }

        /*
         * Makes sure that Tweet and those with duplicate user names is no longer waiting
         */
        function didNotGetCoords(userName) {

            $.each(results, function() {
                if (!this.waiting) {
                	checkIfDone();
                    return;
                }
                if (this.from_user == userName) {

                    this.waiting = false;
                    failure(this, null);
                    checkIfDone();

                }
            });

            checkIfDone();

        }

        function useGoogle(user) {

            //apply heuristics
            var locationString = user.location.replace(/^[^A-Za-z0-9\-]+/, '').replace(/[^A-Za-z0-9]+$/, '').replace(/\$/ig, 's');

            if (/Cali/i.test(locationString) && !/California/i.test(locationString) && !/Colombia/i.test(locationString)) {
                locationString = locationString.replace(/Cali/ig, "California");
            } else if (/Jersey/i.test(locationString) && !/New\s*Jersey/i.test(locationString) && !/Britain/i.test(locationString) && !/Channel Island/i.test(locationString)) {
                locationString = locationString.replace(/Jersey/ig, "New Jersey");
                //What up, Tyga?
            } else if (/\WRack\s*City/i.test(locationString) || /^Rack\s*City/i.test(locationString)) {
                locationString = locationString.replace(/Rack\s*City/ig, "Las Vegas");
            } else if ((/\s+/i.test(locationString) ? (locationString.match(/\s+/ig).length > 3) : false) && !/[,]/i.test(locationString)) {
                didNotGetCoords(user.screen_name);
                return;
            } else if (/worldwide/i.test(locationString)) {
                didNotGetCoords(user.screen_name);
                return;
            } else if ((/I'm/i.test(locationString))) {
                didNotGetCoords(user.screen_name);
                return;
            } else if ((/\s+/i.test(locationString) ? (locationString.match(/\s+/ig).length > 3) : false) && !/[,]/i.test(locationString)) {
                didNotGetCoords(user.screen_name);
                return;
            } else if ((/\//i.test(locationString))) {
                didNotGetCoords(user.screen_name);
                return;
            } else if ((/Yo/i.test(locationString))) {
                didNotGetCoords(user.screen_name);
                return;
            } else if ((/\.\.\./i.test(locationString))) {
                didNotGetCoords(user.screen_name);
                return;
            } else if ((/…/i.test(locationString))) {
                didNotGetCoords(user.screen_name);
                return;
            } else if (/Universe/i.test(locationString)) {
                didNotGetCoords(user.screen_name);
                return;
            } else if (/Cloud 9/i.test(locationString) || /Cloud Nine/i.test(locationString)) {
                didNotGetCoords(user.screen_name);
                return;
            } else if (/Earth/i.test(locationString) && !/Texas/i.test(locationString)) {
                didNotGetCoords(user.screen_name);
                return;
            }

            new google.maps.Geocoder().geocode({
                'address' : locationString
            }, function(results, status) {

                if (status == google.maps.GeocoderStatus.OK) {
                    if (results.length <= 3 || (/Springfield/i.test(locationString) || /Atl/i.test(locationString))) {
                        gotCoords(user.screen_name, results[0].geometry.location.lat(), results[0].geometry.location.lng(), results)
                    } else {
                        didNotGetCoords(user.screen_name);
                    }
                } else {
                    didNotGetCoords(user.screen_name);

                }

            });

        }

        //SYNCHRONOUS FUNCTIONS AT END OF ASYNC THREADS


        /**
         * Checks to see if all waiting status of all results ar done, and changes canvas accordingly
         */
        function checkIfDone() {
            var done = true;
            var hasResult = false;
            

            for ( i = 0; i < results.length; i++) {
            	console.log('results[' + i + '].waiting: ' + results[i].waiting);
            	console.log('results[' + i + '].geo_info.valid: ' + results[i].geo_info.valid);
            	console.log('results[i]:');
            	console.log(results[i]);
                if (results[i].waiting) {
                    done = false;
                    break;
                }
                if (results[i].geo_info.valid) {
                    hasResult = true;
                }
            }
			console.log(done);
            if (done) {
                if (hasResult) {
                    finish(true);
                } else {
                    console.log('failed'); finish(false);
                }
            }//if (done)

        }

    var area_codes = {"date_updated": "2012-04-18", "area_codes": [{"area_code": 201, "city": "Jersey city, NJ", "lat": 40.728157499999988, "lng": -74.077641700000001}, {"area_code": 202, "city": "Washington, DC", "lat": 38.895111800000002, "lng": -77.036365799999999}, {"area_code": 203, "city": "New Haven, CT", "lat": 41.308152700000001, "lng": -72.9281577}, {"area_code": 204, "city": "Winnipeg, MB", "lat": 49.8833, "lng": -97.1500}, {"area_code": 205, "city": "Birmingham, AL", "lat": 33.520660800000002, "lng": -86.802489999999992}, {"area_code": 206, "city": "Seattle, WA", "lat": 47.606209499999999, "lng": -122.3320708}, {"area_code": 207, "city": "Portland, ME", "lat": 43.661471000000013, "lng": -70.255325900000003}, {"area_code": 208, "city": "Boise, ID", "lat": 43.613739000000002, "lng": -116.237651}, {"area_code": 209, "city": "Modesto, CA", "lat": 37.639097199999988, "lng": -120.9968782}, {"area_code": 210, "city": "San Antonio, TX", "lat": 29.424121899999999, "lng": -98.493628199999989}, {"area_code": 212, "city": "New York, NY", "lat": 40.7143528, "lng": -74.005973099999991}, {"area_code": 213, "city": "Los Angeles, CA", "lat": 34.052234200000001, "lng": -118.24368490000001}, {"area_code": 214, "city": "Dallas, TX", "lat": 32.802954999999997, "lng": -96.769923000000006}, {"area_code": 215, "city": "Philadelphia, PA", "lat": 39.952334999999998, "lng": -75.163789000000008}, {"area_code": 216, "city": "Cleveland, OH", "lat": 41.499495400000001, "lng": -81.695408799999996}, {"area_code": 217, "city": "Champaign, IL", "lat": 40.116420400000003, "lng": -88.2433829}, {"area_code": 218, "city": "Duluth, MN", "lat": 46.786671899999988, "lng": -92.100485199999994}, {"area_code": 219, "city": "Gary, IN", "lat": 41.593369600000003, "lng": -87.3464271}, {"area_code": 224, "city": "Wauconda, IL", "lat": 42.258912199999997, "lng": -88.139247400000002}, {"area_code": 225, "city": "Baton Rouge, LA", "lat": 30.4582829, "lng": -91.140319599999998}, {"area_code": 228, "city": "Gulfport, MS", "lat": 30.3674198, "lng": -89.0928155}, {"area_code": 229, "city": "Albany, GA", "lat": 31.578507399999999, "lng": -84.155740999999992}, {"area_code": 231, "city": "Muskegon, MI", "lat": 43.234181300000003, "lng": -86.24839209999999}, {"area_code": 234, "city": "Akron, OH", "lat": 41.081444699999999, "lng": -81.519005299999989}, {"area_code": 239, "city": "Naples, FL", "lat": 26.142035799999999, "lng": -81.794810299999995}, {"area_code": 240, "city": "Gaithersburg, MD", "lat": 39.143440599999998, "lng": -77.201370499999996}, {"area_code": 248, "city": "Royal Oak, MI", "lat": 42.489480100000002, "lng": -83.144648500000002}, {"area_code": 250, "city": "Shalalth, BC", "lat": 50.732205, "lng": -122.232405}, {"area_code": 251, "city": "Mobile, AL", "lat": 30.694356599999999, "lng": -88.043054099999992}, {"area_code": 252, "city": "Greenville, NC", "lat": 35.612661000000003, "lng": -77.366353799999999}, {"area_code": 253, "city": "Tacoma, WA", "lat": 47.252876800000003, "lng": -122.4442906}, {"area_code": 254, "city": "Waco, TX", "lat": 31.549333000000001, "lng": -97.146669500000002}, {"area_code": 256, "city": "Huntsville, AL", "lat": 34.730368800000001, "lng": -86.586103699999995}, {"area_code": 260, "city": "Auburn, IN", "lat": 41.366994200000001, "lng": -85.058857500000002}, {"area_code": 262, "city": "Racine, WI", "lat": 42.726130900000001, "lng": -87.782852300000016}, {"area_code": 267, "city": "Doylestown, PA", "lat": 40.310106300000001, "lng": -75.129893899999999}, {"area_code": 269, "city": "Woodland, MI", "lat": 42.726701400000003, "lng": -85.133612900000003}, {"area_code": 270, "city": "Bowling Green, KY", "lat": 36.990319900000003, "lng": -86.443601799999996}, {"area_code": 276, "city": "Martinsville, VA", "lat": 36.691526199999998, "lng": -79.872538599999999}, {"area_code": 281, "city": "Houston, TX", "lat": 29.760192700000001, "lng": -95.369389599999991}, {"area_code": 289, "city": "Aurora, ON", "lat": 44.006480000000003, "lng": -79.450395999999998}, {"area_code": 301, "city": "Rockville, MD", "lat": 39.0839973, "lng": -77.152757800000003}, {"area_code": 302, "city": "Wilmington, DE", "lat": 39.745833300000001, "lng": -75.546666700000003}, {"area_code": 303, "city": "Denver, CO", "lat": 39.737566999999999, "lng": -104.98471790000001}, {"area_code": 304, "city": "Charleston, WV", "lat": 38.349819500000002, "lng": -81.6326234}, {"area_code": 305, "city": "Miami, FL", "lat": 25.7889689, "lng": -80.226439299999996}, {"area_code": 306, "city": "Yellow Creek, SK", "lat": 52.749570400000003, "lng": -105.2486885}, {"area_code": 307, "city": "Cheyenne, WY", "lat": 41.139981400000003, "lng": -104.8202462}, {"area_code": 308, "city": "Grand Island, NE", "lat": 40.9263957, "lng": -98.342011799999995}, {"area_code": 309, "city": "Peoria, IL", "lat": 40.693648799999998, "lng": -89.588986399999996}, {"area_code": 310, "city": "Los Angeles, CA", "lat": 34.052234200000001, "lng": -118.24368490000001}, {"area_code": 312, "city": "Chicago, IL", "lat": 41.878113599999999, "lng": -87.629798199999996}, {"area_code": 313, "city": "Detroit, MI", "lat": 42.331426999999998, "lng": -83.0457538}, {"area_code": 314, "city": "Saint Louis, MO", "lat": 38.627002500000003, "lng": -90.199404199999989}, {"area_code": 315, "city": "Syracuse, NY", "lat": 43.048122100000001, "lng": -76.147424399999991}, {"area_code": 316, "city": "Wichita, KS", "lat": 37.688888899999988, "lng": -97.336111099999997}, {"area_code": 317, "city": "Indianapolis, IN", "lat": 39.768515499999999, "lng": -86.158073599999994}, {"area_code": 318, "city": "Shreveport, LA", "lat": 32.525151600000001, "lng": -93.750178899999995}, {"area_code": 319, "city": "Cedar Rapids, IA", "lat": 41.9778795, "lng": -91.665623199999999}, {"area_code": 320, "city": "Saint Cloud, MN", "lat": 45.553888899999997, "lng": -94.170277799999994}, {"area_code": 321, "city": "Melbourne, FL", "lat": 28.083626899999999, "lng": -80.608108899999991}, {"area_code": 323, "city": "Los Angeles, CA", "lat": 34.052234200000001, "lng": -118.24368490000001}, {"area_code": 325, "city": "Menard, TX", "lat": 30.91767359999999, "lng": -99.786458699999997}, {"area_code": 330, "city": "Akron, OH", "lat": 41.081444699999999, "lng": -81.519005299999989}, {"area_code": 331, "city": "Elmhurst, IL", "lat": 41.899474400000003, "lng": -87.940341799999999}, {"area_code": 334, "city": "Montgomery, AL", "lat": 32.366805200000002, "lng": -86.299968899999996}, {"area_code": 336, "city": "Greensboro, NC", "lat": 36.072635400000003, "lng": -79.791975399999998}, {"area_code": 337, "city": "Lafayette, LA", "lat": 30.2240897, "lng": -92.019842699999998}, {"area_code": 339, "city": "Hingham, MA", "lat": 42.2418172, "lng": -70.889758999999998}, {"area_code": 340, "city": "Charlotte Amalie, VI", "lat": 18.3419004, "lng": -64.930700700000003}, {"area_code": 347, "city": "Ridgewood, NY", "lat": 40.710847600000001, "lng": -73.897769299999993}, {"area_code": 351, "city": "Danvers, MA", "lat": 42.575000899999999, "lng": -70.932121999999993}, {"area_code": 352, "city": "Gainesville, FL", "lat": 29.651634399999999, "lng": -82.32482619999999}, {"area_code": 360, "city": "Vancouver, WA", "lat": 45.638728100000002, "lng": -122.6614861}, {"area_code": 361, "city": "Corpus Christi, TX", "lat": 27.800582800000001, "lng": -97.396380999999991}, {"area_code": 385, "city": "Provo, UT", "lat": 40.233843800000002, "lng": -111.65853370000001}, {"area_code": 386, "city": "Daytona Beach, FL", "lat": 29.2108147, "lng": -81.0228331}, {"area_code": 401, "city": "Providence, RI", "lat": 41.823989099999999, "lng": -71.4128343}, {"area_code": 402, "city": "Omaha, NE", "lat": 41.2523634, "lng": -95.997988299999989}, {"area_code": 403, "city": "Ralston, AB", "lat": 50.250844000000001, "lng": -111.17308199999999}, {"area_code": 404, "city": "Atlanta, GA", "lat": 33.748995399999998, "lng": -84.387982399999999}, {"area_code": 405, "city": "Oklahoma city, OK", "lat": 35.467560200000001, "lng": -97.5164276}, {"area_code": 406, "city": "Billings, MT", "lat": 45.783285599999999, "lng": -108.5006904}, {"area_code": 407, "city": "Orlando, FL", "lat": 28.538335499999999, "lng": -81.379236500000005}, {"area_code": 408, "city": "San Jose, CA", "lat": 37.339385700000001, "lng": -121.89495549999999}, {"area_code": 409, "city": "Beaumont, TX", "lat": 30.080174, "lng": -94.126556199999996}, {"area_code": 410, "city": "Baltimore, MD", "lat": 39.290384799999998, "lng": -76.612189299999997}, {"area_code": 412, "city": "Pittsburgh, PA", "lat": 40.440624799999988, "lng": -79.995886400000003}, {"area_code": 413, "city": "Springfield, MA", "lat": 42.101483100000003, "lng": -72.589810999999997}, {"area_code": 414, "city": "Milwaukee, WI", "lat": 43.038902499999999, "lng": -87.906473599999998}, {"area_code": 415, "city": "San Francisco, CA", "lat": 37.774929499999999, "lng": -122.4194155}, {"area_code": 416, "city": "Toronto, ON", "lat": 43.653225999999997, "lng": -79.383184299999996}, {"area_code": 417, "city": "Springfield, MO", "lat": 37.2089572, "lng": -93.292298899999992}, {"area_code": 418, "city": "Riviere Du Loup, QC", "lat": 47.835957000000001, "lng": -69.535985400000001}, {"area_code": 419, "city": "Toledo, OH", "lat": 41.663938299999998, "lng": -83.555212000000012}, {"area_code": 423, "city": "Chattanooga, TN", "lat": 35.045629699999999, "lng": -85.309680099999994}, {"area_code": 424, "city": "Hawthorne, CA", "lat": 33.916403199999998, "lng": -118.3525748}, {"area_code": 425, "city": "Kirkland, WA", "lat": 47.681487500000003, "lng": -122.2087353}, {"area_code": 430, "city": "Texarkana, TX", "lat": 33.425125000000001, "lng": -94.04768820000001}, {"area_code": 432, "city": "Balmorhea, TX", "lat": 30.984312299999999, "lng": -103.7446257}, {"area_code": 434, "city": "Lynchburg, VA", "lat": 37.4137536, "lng": -79.142246399999991}, {"area_code": 435, "city": "St George, UT", "lat": 37.095277799999998, "lng": -113.5780556}, {"area_code": 440, "city": "Cleveland, OH", "lat": 41.499495400000001, "lng": -81.695408799999996}, {"area_code": 442, "city": "Oceanside, CA", "lat": 33.195869600000002, "lng": -117.3794834}, {"area_code": 443, "city": "Pikesville, MD", "lat": 39.374272900000001, "lng": -76.722472699999997}, {"area_code": 450, "city": "Farnham, QC", "lat": 45.283748000000003, "lng": -72.976764000000003}, {"area_code": 458, "city": "Oregon", "lat": 43.804133399999998, "lng": -120.55420119999999}, {"area_code": 469, "city": "Plano, TX", "lat": 33.019843100000003, "lng": -96.698885599999997}, {"area_code": 470, "city": "Georgia", "lat": 32.157435100000001, "lng": -82.907123000000013}, {"area_code": 475, "city": "New Haven, CT", "lat": 41.308152700000001, "lng": -72.9281577}, {"area_code": 478, "city": "Macon, GA", "lat": 32.840694599999999, "lng": -83.632402200000001}, {"area_code": 479, "city": "Dover, AR", "lat": 35.401471200000003, "lng": -93.1143407}, {"area_code": 480, "city": "Mesa, AZ", "lat": 33.4151843, "lng": -111.8314724}, {"area_code": 484, "city": "Exton, PA", "lat": 40.032581700000001, "lng": -75.627458300000001}, {"area_code": 501, "city": "Little Rock, AR", "lat": 34.746480900000002, "lng": -92.289594799999989}, {"area_code": 502, "city": "Louisville, KY", "lat": 38.252664699999997, "lng": -85.758455699999999}, {"area_code": 503, "city": "Portland, OR", "lat": 45.5234515, "lng": -122.6762071}, {"area_code": 504, "city": "New Orleans, LA", "lat": 29.951065799999991, "lng": -90.071532300000001}, {"area_code": 505, "city": "Albuquerque, NM", "lat": 35.084490899999999, "lng": -106.6511367}, {"area_code": 506, "city": "Tracadie, NB", "lat": 47.514444400000002, "lng": -64.918055600000002}, {"area_code": 507, "city": "Rochester, MN", "lat": 44.021630600000002, "lng": -92.4698992}, {"area_code": 508, "city": "Worcester, MA", "lat": 42.262593199999998, "lng": -71.802293399999996}, {"area_code": 509, "city": "Spokane, WA", "lat": 47.658780200000002, "lng": -117.42604660000001}, {"area_code": 510, "city": "Oakland, CA", "lat": 37.804363700000003, "lng": -122.2711137}, {"area_code": 512, "city": "Austin, TX", "lat": 30.267153, "lng": -97.743060799999995}, {"area_code": 513, "city": "Cincinnati, OH", "lat": 39.103118199999997, "lng": -84.512019600000002}, {"area_code": 514, "city": "Montreal, QC", "lat": 45.508669900000001, "lng": -73.553992499999993}, {"area_code": 515, "city": "Des Moines, IA", "lat": 41.600544800000002, "lng": -93.609106400000002}, {"area_code": 516, "city": "Lynbrook, NY", "lat": 40.654825299999999, "lng": -73.67179689999999}, {"area_code": 517, "city": "Lansing, MI", "lat": 42.732534999999999, "lng": -84.555534699999995}, {"area_code": 518, "city": "Albany, NY", "lat": 42.652579299999999, "lng": -73.756231700000001}, {"area_code": 519, "city": "Saint Marys, ON", "lat": 43.259586800000001, "lng": -81.140653}, {"area_code": 520, "city": "Tucson, AZ", "lat": 32.221742900000002, "lng": -110.926479}, {"area_code": 530, "city": "Chico, CA", "lat": 39.728494400000002, "lng": -121.83747769999999}, {"area_code": 539, "city": "Tulsa, OK", "lat": 36.153981600000002, "lng": -95.992775000000009}, {"area_code": 540, "city": "Roanoke, VA", "lat": 37.270970400000003, "lng": -79.9414266}, {"area_code": 541, "city": "Eugene, OR", "lat": 44.052069099999997, "lng": -123.08675359999999}, {"area_code": 551, "city": "Jersey city, NJ", "lat": 40.728157499999988, "lng": -74.077641700000001}, {"area_code": 559, "city": "Fresno, CA", "lat": 36.7477272, "lng": -119.7723661}, {"area_code": 561, "city": "West Palm Beach, FL", "lat": 26.715342400000001, "lng": -80.053374599999998}, {"area_code": 562, "city": "Long Beach, CA", "lat": 33.768321, "lng": -118.1956168}, {"area_code": 563, "city": "Davenport, IA", "lat": 41.523643700000001, "lng": -90.577636699999999}, {"area_code": 567, "city": "New Riegel, OH", "lat": 41.051443800000001, "lng": -83.318534}, {"area_code": 570, "city": "Scranton, PA", "lat": 41.408968999999999, "lng": -75.662412199999991}, {"area_code": 571, "city": "Herndon, VA", "lat": 38.969554500000001, "lng": -77.386097599999999}, {"area_code": 573, "city": "Columbia, MO", "lat": 38.9517053, "lng": -92.334072399999997}, {"area_code": 574, "city": "Macy, IN", "lat": 40.959209000000008, "lng": -86.12721839999999}, {"area_code": 575, "city": "Eagle Nest, NM", "lat": 36.554754000000003, "lng": -105.2636179}, {"area_code": 580, "city": "Lawton, OK", "lat": 34.603566899999997, "lng": -98.395929099999989}, {"area_code": 585, "city": "Rochester, NY", "lat": 43.161029999999997, "lng": -77.610921899999994}, {"area_code": 586, "city": "Roseville, MI", "lat": 42.497258299999999, "lng": -82.937140900000003}, {"area_code": 601, "city": "Jackson, MS", "lat": 32.298757299999998, "lng": -90.184810299999995}, {"area_code": 602, "city": "Phoenix, AZ", "lat": 33.448377100000002, "lng": -112.0740373}, {"area_code": 603, "city": "Manchester, NH", "lat": 42.995639699999998, "lng": -71.454789099999999}, {"area_code": 604, "city": "New Westminister, BC", "lat": 49.210085900000003, "lng": -122.917209}, {"area_code": 605, "city": "Sioux Falls, SD", "lat": 43.549974900000002, "lng": -96.700327000000001}, {"area_code": 606, "city": "London, KY", "lat": 37.1289771, "lng": -84.083264599999993}, {"area_code": 607, "city": "Binghamton, NY", "lat": 42.098686699999988, "lng": -75.917973800000013}, {"area_code": 608, "city": "Madison, WI", "lat": 43.073051700000001, "lng": -89.401230200000001}, {"area_code": 609, "city": "Atlantic city, NJ", "lat": 39.364283399999998, "lng": -74.422926599999997}, {"area_code": 610, "city": "Reading, PA", "lat": 40.335648300000003, "lng": -75.926874699999999}, {"area_code": 612, "city": "Minneapolis, MN", "lat": 44.983333999999999, "lng": -93.266669999999991}, {"area_code": 613, "city": "Adolphustown, ON", "lat": 44.06373, "lng": -77.006559900000013}, {"area_code": 614, "city": "Columbus, OH", "lat": 39.961175500000003, "lng": -82.998794199999992}, {"area_code": 615, "city": "Nashville, TN", "lat": 36.1666667, "lng": -86.783333299999995}, {"area_code": 616, "city": "Grand Rapids, MI", "lat": 42.9633599, "lng": -85.668086299999999}, {"area_code": 617, "city": "Boston, MA", "lat": 42.358430800000001, "lng": -71.059773199999995}, {"area_code": 618, "city": "Belleville, IL", "lat": 38.520050400000002, "lng": -89.983993499999997}, {"area_code": 619, "city": "San Diego, CA", "lat": 32.715329199999999, "lng": -117.1572551}, {"area_code": 620, "city": "Hutchinson, KS", "lat": 38.060844500000002, "lng": -97.929774299999991}, {"area_code": 623, "city": "Phoenix, AZ", "lat": 33.448377100000002, "lng": -112.0740373}, {"area_code": 626, "city": "Alhambra, CA", "lat": 34.095286999999999, "lng": -118.1270146}, {"area_code": 630, "city": "Naperville, IL", "lat": 41.785862899999998, "lng": -88.147289299999997}, {"area_code": 631, "city": "Huntington, NY", "lat": 40.868153900000003, "lng": -73.425675999999996}, {"area_code": 636, "city": "Harvester, MO", "lat": 38.742438999999997, "lng": -90.577636999999996}, {"area_code": 641, "city": "Mason city, IA", "lat": 43.153572799999999, "lng": -93.201036699999989}, {"area_code": 646, "city": "New York, NY", "lat": 40.7143528, "lng": -74.005973099999991}, {"area_code": 647, "city": "Toronto, ON", "lat": 43.653225999999997, "lng": -79.383184299999996}, {"area_code": 650, "city": "San Mateo, CA", "lat": 37.562991699999998, "lng": -122.3255254}, {"area_code": 651, "city": "Saint Paul, MN", "lat": 44.953702900000003, "lng": -93.089957799999993}, {"area_code": 657, "city": "Westminster, CA", "lat": 33.7513419, "lng": -117.9939921}, {"area_code": 660, "city": "Sedalia, MO", "lat": 38.704460900000001, "lng": -93.2282613}, {"area_code": 661, "city": "Bakersfield, CA", "lat": 35.3732921, "lng": -119.01871250000001}, {"area_code": 662, "city": "Tupelo, MS", "lat": 34.257606600000003, "lng": -88.703385900000001}, {"area_code": 671, "city": "Agana Heights, GU", "lat": 13.468194, "lng": 144.74557300000001}, {"area_code": 678, "city": "Atlanta, GA", "lat": 33.748995399999998, "lng": -84.387982399999999}, {"area_code": 681, "city": "Parkersburg, WV", "lat": 39.266741799999998, "lng": -81.56151349999999}, {"area_code": 682, "city": "Roanoke, TX", "lat": 33.004012600000003, "lng": -97.225848299999996}, {"area_code": 684, "city": "Pago Pago, AS", "lat": -14.27933, "lng": -170.700897}, {"area_code": 701, "city": "Fargo, ND", "lat": 46.877186299999998, "lng": -96.789803399999997}, {"area_code": 702, "city": "Las Vegas, NV", "lat": 36.114646, "lng": -115.172816}, {"area_code": 703, "city": "Alexandria, VA", "lat": 38.804835500000003, "lng": -77.046921400000002}, {"area_code": 704, "city": "Charlotte, NC", "lat": 35.227086900000003, "lng": -80.843126699999999}, {"area_code": 705, "city": "Stroud, ON", "lat": 44.324415999999999, "lng": -79.61927}, {"area_code": 706, "city": "Augusta, GA", "lat": 33.474246000000001, "lng": -82.00967}, {"area_code": 707, "city": "Santa Rosa, CA", "lat": 38.440467400000003, "lng": -122.7144314}, {"area_code": 708, "city": "Oak Park, IL", "lat": 41.885031699999999, "lng": -87.784502500000002}, {"area_code": 709, "city": "Fermeuse, NL", "lat": 46.975546899999998, "lng": -52.9599495}, {"area_code": 712, "city": "Sioux city, IA", "lat": 42.499994200000003, "lng": -96.40030689999999}, {"area_code": 713, "city": "Houston, TX", "lat": 29.760192700000001, "lng": -95.369389599999991}, {"area_code": 714, "city": "Santa Ana, CA", "lat": 33.745573100000001, "lng": -117.8678338}, {"area_code": 715, "city": "Eau Claire, WI", "lat": 44.811349, "lng": -91.498494100000002}, {"area_code": 716, "city": "Buffalo, NY", "lat": 42.886446799999987, "lng": -78.878368899999998}, {"area_code": 717, "city": "Lancaster, PA", "lat": 40.037875499999998, "lng": -76.305514400000007}, {"area_code": 718, "city": "Brooklyn, NY", "lat": 40.652876200000001, "lng": -73.959493999999992}, {"area_code": 719, "city": "Colorado Springs, CO", "lat": 38.833881599999998, "lng": -104.8213634}, {"area_code": 720, "city": "Denver, CO", "lat": 39.737566999999999, "lng": -104.98471790000001}, {"area_code": 724, "city": "Greensburg, PA", "lat": 40.301458099999998, "lng": -79.538928900000002}, {"area_code": 727, "city": "Saint Petersburg, FL", "lat": 27.773055599999999, "lng": -82.640000000000001}, {"area_code": 731, "city": "Jackson, TN", "lat": 35.614516899999998, "lng": -88.813946899999991}, {"area_code": 732, "city": "Toms River, NJ", "lat": 39.953735799999997, "lng": -74.197945799999999}, {"area_code": 734, "city": "Ann Arbor, MI", "lat": 42.2808256, "lng": -83.743037799999996}, {"area_code": 740, "city": "Zanesville, OH", "lat": 39.940345299999997, "lng": -82.013192399999994}, {"area_code": 747, "city": "Los Angeles, CA", "lat": 34.052234200000001, "lng": -118.24368490000001}, {"area_code": 754, "city": "Fort Lauderdale, FL", "lat": 26.122308400000001, "lng": -80.143378599999991}, {"area_code": 757, "city": "Virginia Beach, VA", "lat": 36.8529263, "lng": -75.97798499999999}, {"area_code": 760, "city": "Vista, CA", "lat": 33.200036799999999, "lng": -117.2425355}, {"area_code": 762, "city": "Dalton, GA", "lat": 34.7698021, "lng": -84.970222800000002}, {"area_code": 763, "city": "Minneapolis, MN", "lat": 44.983333999999999, "lng": -93.266669999999991}, {"area_code": 765, "city": "Muncie, IN", "lat": 40.193376700000002, "lng": -85.386359900000002}, {"area_code": 769, "city": "Bailey, MS", "lat": 32.467641200000003, "lng": -88.722823599999998}, {"area_code": 770, "city": "Atlanta, GA", "lat": 33.748995399999998, "lng": -84.387982399999999}, {"area_code": 772, "city": "Port Saint Lucie, FL", "lat": 27.275833299999999, "lng": -80.35499999999999}, {"area_code": 773, "city": "Chicago, IL", "lat": 41.878113599999999, "lng": -87.629798199999996}, {"area_code": 774, "city": "Northboro, MA", "lat": 42.320706999999999, "lng": -71.638273999999996}, {"area_code": 775, "city": "Reno, NV", "lat": 39.529632900000003, "lng": -119.8138027}, {"area_code": 778, "city": "Port Coquitlam, BC", "lat": 49.254556000000001, "lng": -122.768539}, {"area_code": 779, "city": "Rockford, IL", "lat": 42.271131099999998, "lng": -89.093995199999995}, {"area_code": 780, "city": "Eaglesham, AB", "lat": 55.782235, "lng": -117.88065}, {"area_code": 781, "city": "Lynn, MA", "lat": 42.466763000000007, "lng": -70.949493799999999}, {"area_code": 785, "city": "Topeka, KS", "lat": 39.055823500000002, "lng": -95.689018499999989}, {"area_code": 786, "city": "Miami, FL", "lat": 25.7889689, "lng": -80.226439299999996}, {"area_code": 787, "city": "Salinas, PR", "lat": 17.957847999999998, "lng": -66.2605176}, {"area_code": 801, "city": "Ogden, UT", "lat": 41.222999999999999, "lng": -111.9738304}, {"area_code": 802, "city": "Burlington, VT", "lat": 44.475882499999997, "lng": -73.212071999999992}, {"area_code": 803, "city": "Columbia, SC", "lat": 34.000710400000003, "lng": -81.034814400000002}, {"area_code": 804, "city": "Richmond, VA", "lat": 37.540724599999997, "lng": -77.436048099999994}, {"area_code": 805, "city": "Santa Barbara, CA", "lat": 34.420830500000001, "lng": -119.69819010000001}, {"area_code": 806, "city": "Lubbock, TX", "lat": 33.577863100000002, "lng": -101.8551665}, {"area_code": 807, "city": "Hudson, ON", "lat": 50.083520999999998, "lng": -92.187698999999995}, {"area_code": 808, "city": "Honolulu, HI", "lat": 21.306944399999999, "lng": -157.8583333}, {"area_code": 810, "city": "Flint, MI", "lat": 43.012527400000003, "lng": -83.6874562}, {"area_code": 812, "city": "Evansville, IN", "lat": 37.971559200000002, "lng": -87.571089799999996}, {"area_code": 813, "city": "Tampa, FL", "lat": 27.950575000000001, "lng": -82.457177599999994}, {"area_code": 814, "city": "Erie, PA", "lat": 42.129224099999988, "lng": -80.085059000000001}, {"area_code": 815, "city": "Rockford, IL", "lat": 42.271131099999998, "lng": -89.093995199999995}, {"area_code": 816, "city": "Kansas city, MO", "lat": 39.099726500000003, "lng": -94.578566699999996}, {"area_code": 817, "city": "Fort Worth, TX", "lat": 32.725408999999999, "lng": -97.320849600000003}, {"area_code": 818, "city": "Van Nuys, CA", "lat": 34.189856599999999, "lng": -118.451357}, {"area_code": 819, "city": "Gentilly, QC", "lat": 46.402735, "lng": -72.274845999999997}, {"area_code": 828, "city": "Asheville, NC", "lat": 35.600945199999998, "lng": -82.554014999999993}, {"area_code": 830, "city": "New Braunfels, TX", "lat": 29.703002399999999, "lng": -98.124453099999997}, {"area_code": 831, "city": "Santa Cruz, CA", "lat": 36.974117100000001, "lng": -122.03079630000001}, {"area_code": 832, "city": "Houston, TX", "lat": 29.760192700000001, "lng": -95.369389599999991}, {"area_code": 843, "city": "Charleston, SC", "lat": 32.776565599999998, "lng": -79.930921599999991}, {"area_code": 845, "city": "Spring Valley, NY", "lat": 41.1131514, "lng": -74.043752100000006}, {"area_code": 847, "city": "Arlington Hts, IL", "lat": 42.088360299999998, "lng": -87.980626500000014}, {"area_code": 848, "city": "Metuchen, NJ", "lat": 40.543159799999998, "lng": -74.363204899999999}, {"area_code": 850, "city": "Tallahassee, FL", "lat": 30.438255900000001, "lng": -84.28073289999999}, {"area_code": 856, "city": "Moorestown, NJ", "lat": 39.968881699999997, "lng": -74.948886000000002}, {"area_code": 857, "city": "Quincy, MA", "lat": 42.2528772, "lng": -71.002270499999995}, {"area_code": 858, "city": "San Diego, CA", "lat": 32.715329199999999, "lng": -117.1572551}, {"area_code": 859, "city": "Lexington, KY", "lat": 38.040583699999999, "lng": -84.503716400000002}, {"area_code": 860, "city": "Hartford, CT", "lat": 41.763711099999988, "lng": -72.685093199999997}, {"area_code": 862, "city": "Pompton Lakes, NJ", "lat": 41.005375299999997, "lng": -74.290704099999999}, {"area_code": 863, "city": "Lakeland, FL", "lat": 28.039465400000001, "lng": -81.949804200000003}, {"area_code": 864, "city": "Greenville, SC", "lat": 34.852617599999988, "lng": -82.394010399999999}, {"area_code": 865, "city": "Knoxville, TN", "lat": 35.960638400000001, "lng": -83.9207392}, {"area_code": 867, "city": "Wekweti, NT", "lat": 64.117337599999999, "lng": -114.1863525}, {"area_code": 867, "city": "Wekweti, NT", "lat": 64.117337599999999, "lng": -114.1863525}, {"area_code": 867, "city": "Wekweti, NT", "lat": 64.117337599999999, "lng": -114.1863525}, {"area_code": 870, "city": "Jonesboro, AR", "lat": 35.842296700000013, "lng": -90.704279}, {"area_code": 872, "city": "Chicago, IL", "lat": 41.878113599999999, "lng": -87.629798199999996}, {"area_code": 878, "city": "Pennsylvania", "lat": 41.203321600000002, "lng": -77.194524700000002}, {"area_code": 901, "city": "Memphis, TN", "lat": 35.149534299999999, "lng": -90.048980099999994}, {"area_code": 902, "city": "Georgetown, PE", "lat": 46.1843723, "lng": -62.533553400000002}, {"area_code": 902, "city": "Georgetown, PE", "lat": 46.1843723, "lng": -62.533553400000002}, {"area_code": 903, "city": "Tyler, TX", "lat": 32.351260099999998, "lng": -95.301062399999992}, {"area_code": 904, "city": "Jacksonville, FL", "lat": 30.332183799999999, "lng": -81.655650999999992}, {"area_code": 905, "city": "Wellandport, ON", "lat": 43.005153999999997, "lng": -79.482089000000002}, {"area_code": 906, "city": "Marquette, MI", "lat": 46.574585599999999, "lng": -87.464445900000001}, {"area_code": 907, "city": "Anchorage, AK", "lat": 61.2180556, "lng": -149.9002778}, {"area_code": 908, "city": "Plainfield, NJ", "lat": 40.6337136, "lng": -74.4073736}, {"area_code": 909, "city": "San Bernardino, CA", "lat": 34.108344899999999, "lng": -117.28976520000001}, {"area_code": 910, "city": "Fayetteville, NC", "lat": 35.052664100000001, "lng": -78.87835849999999}, {"area_code": 912, "city": "Savannah, GA", "lat": 32.0835407, "lng": -81.099834199999989}, {"area_code": 913, "city": "Kansas city, KS", "lat": 39.114052999999998, "lng": -94.627463599999999}, {"area_code": 914, "city": "Yonkers, NY", "lat": 40.931209899999999, "lng": -73.898746899999992}, {"area_code": 915, "city": "El Paso, TX", "lat": 31.758719800000001, "lng": -106.4869314}, {"area_code": 916, "city": "Sacramento, CA", "lat": 38.5815719, "lng": -121.49439959999999}, {"area_code": 917, "city": "New York, NY", "lat": 40.7143528, "lng": -74.005973099999991}, {"area_code": 918, "city": "Tulsa, OK", "lat": 36.153981600000002, "lng": -95.992775000000009}, {"area_code": 919, "city": "Raleigh, NC", "lat": 35.772095999999998, "lng": -78.638614500000003}, {"area_code": 920, "city": "Green Bay, WI", "lat": 44.519158999999988, "lng": -88.019825999999995}, {"area_code": 925, "city": "Walnut Creek, CA", "lat": 37.906313099999998, "lng": -122.06496300000001}, {"area_code": 928, "city": "Yuma, AZ", "lat": 32.6926512, "lng": -114.62769160000001}, {"area_code": 929, "city": "Flushing, NY", "lat": 40.765808499999999, "lng": -73.83308439999999}, {"area_code": 931, "city": "Clarksville, TN", "lat": 36.529770599999999, "lng": -87.3594528}, {"area_code": 936, "city": "Conroe, TX", "lat": 30.311876900000001, "lng": -95.45605119999999}, {"area_code": 937, "city": "Dayton, OH", "lat": 39.758947800000001, "lng": -84.191606899999996}, {"area_code": 938, "city": "Red Bay, AL", "lat": 34.4398202, "lng": -88.140874699999998}, {"area_code": 939, "city": "Adjuntas, PR", "lat": 18.1967468, "lng": -66.736734499999997}, {"area_code": 940, "city": "Wichita Falls, TX", "lat": 33.913708499999998, "lng": -98.493387299999995}, {"area_code": 941, "city": "Sarasota, FL", "lat": 27.336434700000002, "lng": -82.53065269999999}, {"area_code": 947, "city": "Ortonville, MI", "lat": 42.852250599999998, "lng": -83.4430002}, {"area_code": 949, "city": "Toro, CA", "lat": 33.416699000000001, "lng": -116.1341712}, {"area_code": 951, "city": "Murrieta, CA", "lat": 33.553914300000002, "lng": -117.2139232}, {"area_code": 952, "city": "Minneapolis, MN", "lat": 44.983333999999999, "lng": -93.266669999999991}, {"area_code": 954, "city": "Fort Lauderdale, FL", "lat": 26.122308400000001, "lng": -80.143378599999991}, {"area_code": 956, "city": "Laredo, TX", "lat": 27.506406999999999, "lng": -99.507542099999995}, {"area_code": 970, "city": "Ft Collins, CO", "lat": 40.5852602, "lng": -105.084423}, {"area_code": 971, "city": "Portland, OR", "lat": 45.5234515, "lng": -122.6762071}, {"area_code": 972, "city": "Dallas, TX", "lat": 32.802954999999997, "lng": -96.769923000000006}, {"area_code": 973, "city": "Newark, NJ", "lat": 40.735657000000003, "lng": -74.172366699999998}, {"area_code": 978, "city": "Lowell, MA", "lat": 42.633424699999999, "lng": -71.316171799999992}, {"area_code": 979, "city": "Bryan, TX", "lat": 30.674364300000001, "lng": -96.369963200000001}, {"area_code": 980, "city": "Charlotte, NC", "lat": 35.227086900000003, "lng": -80.843126699999999}, {"area_code": 985, "city": "Houma, LA", "lat": 29.595769600000001, "lng": -90.719534799999991}, {"area_code": 989, "city": "Saginaw, MI", "lat": 43.419469900000003, "lng": -83.950806799999995}]}

}
