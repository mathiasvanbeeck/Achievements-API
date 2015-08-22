var express = require('express');
var router = express.Router();
var monk = require('monk');
var db = monk('localhost:27017/achievementsapi')


/* GET users listing. */
router.get('/', function(req, res, next) {
  //var db = req.db;
  var collection = db.get('detailedgames');
  collection.find({},function(e,docs){
    res.json(docs);
  });
});

router.get('/:appid', function(req, res, next) {
  var db = req.db;
  var collection = db.get('detailedgames');
  var number = Number(req.params.appid);

  collection.findOne({appid:number}, function(e, docs){
    res.json(docs);
  });
});



module.exports = router;
