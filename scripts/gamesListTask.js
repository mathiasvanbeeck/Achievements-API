var request = require('request');
var monk = require('monk');
var db = monk('localhost:27017/achievementsapi')

/*
* Downloads and stores a list of all games on Steam.
* appid: The id of the game.
* name: The name of the game.
*/
request('http://api.steampowered.com/ISteamApps/GetAppList/v2', function (error, response, body) {
    if (!error && response.statusCode == 200) {

      var json = JSON.parse(body);

      var gamesCollection = db.get('games');
      gamesCollection.remove({});
      var result = gamesCollection.insert(json.applist.apps, {});

      console.log("Saved " + json.applist.apps.length + " games.");

      process.exit();
   }

});
