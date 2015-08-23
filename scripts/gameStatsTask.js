var request = require('request');
var monk = require('monk');
var db = monk('localhost:27017/achievementsapi')

/*
* Downloads and stores the stats for a single game. Pass in the game's appid to specificy which one.
*/

// Get the app id from the command line parameters (0 = "node", 1 = [path to this file])
var appId = process.argv[2];

var gameSchemeJson;
var gameGlobalStatsJson;

var schemeReady = false, globalStatsReady = false;



if(appId == null)
{
  console.log("Supply an appId when running this script.");
  process.exit();
}


request('http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=EB5773FAAF039592D9383FA104EEA55D&appid=' + appId, function (error, response, body) {
    if (!error && response.statusCode == 200) {

      gameSchemeJson = JSON.parse(body);
      schemeReady = true;

      console.log("Retrieved game scheme info for " +gameSchemeJson.game.gameName);

      combineData();
   }
});

request('http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=' + appId, function (error, response, body) {
    if (!error && response.statusCode == 200) {

      gameGlobalStatsJson = JSON.parse(body);
      globalStatsReady = true;

      console.log("Found global stats for " + gameGlobalStatsJson.achievementpercentages.achievements.length + " achievements.");

      combineData();
   }
});

function combineData()
{
  if(schemeReady && globalStatsReady)
  {
    console.log("combine data here");
    gameSchemeJson.game.availableGameStats.achievements.forEach(function(item){
      // fixme can this not just return an item instead of an array with 1 item?
      var globalPercentage = getGlobalPercentage(item.name)[0].percent;

      item.percent = globalPercentage;
    });

    saveData();
  }
}

function saveData()
{
  // First retrieve the name of the game by using the supplied appid
  var gamesCollection = db.get('games');
  gamesCollection.findOne({appid:Number(appId)}, function(e, docs){
    // Set the game name, since this field is often empty in the Steam API.
    gameSchemeJson.game.gameName = docs.name;
    // Add the appId, could be useful.
    gameSchemeJson.game.appid = Number(appId);

    // Save the completed game schema + global stats + name
    var detailedgames = db.get('detailedgames');
    detailedgames.remove({ "gameName": gameSchemeJson.game.gameName }, function (err) {
      if (err) throw err;
    });

    // todo: only remove the game we searched for now - should be able to use the id (need index?)
    detailedgames.remove({appid:Number(appId)});
    detailedgames.insert(gameSchemeJson.game, {});
    detailedgames.index('appid', 1);

    console.log("Saved data for " +gameSchemeJson.game.gameName);

    process.exit();
  });
}

function getGlobalPercentage(searchName) {
  return gameGlobalStatsJson.achievementpercentages.achievements.filter(
    function(gameGlobalStatsJson) {
      return gameGlobalStatsJson.name == searchName;
    }
  );
}
