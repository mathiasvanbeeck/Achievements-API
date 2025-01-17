var request = require('request');
var monk = require('monk');
var db = monk('localhost:27017/achievementsapi')
var gamesCollection = db.get('games');
var detailedGamesCollection = db.get('detailedGames');


/*
* Downloads and stores the stats for a single game. Pass in the game's appid to specificy which one.
*/

// Get the app id from the command line parameters (0 = "node", 1 = [path to this file])
var appId = process.argv[2];

var gameSchemeJson;
var gameGlobalStatsJson;

var schemeReady = false, globalStatsReady = false;
var hasStats = false;
var numberOfAchievements = 0;


if(appId == null)
{
  console.log("Supply an appId when running this script.");
  process.exit();
}

/*
* Downloads the game's scheme: detailed info on achievements and stats.
*/
request('http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=EB5773FAAF039592D9383FA104EEA55D&appid=' + appId, function (error, response, body) {
    if (!error && response.statusCode == 200) {

      gameSchemeJson = JSON.parse(body);
      schemeReady = true;

      // Check if the game has achievements or stats.
      if(gameSchemeJson.game.gameName != undefined)
      {
        numberOfAchievements = gameSchemeJson.game.availableGameStats.achievements.length;
        hasStats = ((gameSchemeJson.game.availableGameStats.stats != undefined) && (gameSchemeJson.game.availableGameStats.stats.length > 0));
      }

      combineData();
   }
});

/*
* Downloads the global achievement percetages.
*/
request('http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=' + appId, function (error, response, body) {
    if (!error && response.statusCode == 200) {

      gameGlobalStatsJson = JSON.parse(body);
      globalStatsReady = true;

      combineData();
   }
});

function combineData()
{
  if(schemeReady && globalStatsReady)
  {
    if(numberOfAchievements > 0 || hasStats)
    {
      gameSchemeJson.game.availableGameStats.achievements.forEach(function(item){
        // fixme can this not just return an item instead of an array with 1 item?
        var globalPercentage = getGlobalPercentage(item.name)[0].percent;

        item.percent = globalPercentage;
      });

      saveData();
    }
    else {
      console.log('Game has no achievements or stats');
      updateGame();
    }
  }
}

/*
* Saves the game details to the detailedGames collection.
*/
function saveData()
{
  if(numberOfAchievements > 0 || hasStats)
  {
      gamesCollection.findOne({appid:Number(appId)}, function(e, docs){
      // Set the game name, since this field is often empty in the Steam API.
      gameSchemeJson.game.gameName = docs.name;
      // Add the appId, could be useful.
      gameSchemeJson.game.appid = Number(appId);

      // Save the completed game schema + global stats + name
      detailedGamesCollection.remove({appid:Number(appId)});
      detailedGamesCollection.insert(gameSchemeJson.game, {});
      detailedGamesCollection.index('appid', 1);

      console.log("Saved detailedgame data for " +gameSchemeJson.game.gameName);

      updateGame();
    });
  }
  else {
    updateGame();
  }
}

/*
* Updates the game in the simple games table. Adds the hasStats and numberOfAchievements fields.
*/
function updateGame()
{
  console.log("Updating basic game");
  gamesCollection.update(
    {appid:Number(appId)},
    {$set:
      {"hasStats":hasStats,
      "numberOfAchievements":Number(numberOfAchievements)}
    },
    function(e, docs)
    {
      console.log('All done.');
      process.exit();
    }
  );
}

function getGlobalPercentage(searchName) {
  return gameGlobalStatsJson.achievementpercentages.achievements.filter(
    function(gameGlobalStatsJson) {
      return gameGlobalStatsJson.name == searchName;
    }
  );
}
