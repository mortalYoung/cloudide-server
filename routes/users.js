var express = require("express");
var router = express.Router();

const { getUsers, setUsers } = require("../utils");

router.post("/login", function (req, res, next) {
  const { username, password } = req.body;
  if (username === password) {
    res.cookie("username", username);
    setUsers(username);
    res.json({
      success: true,
    });
  } else {
    res.json({
      success: false,
    });
  }
});

router.get("/isLogin", function (req, res, next) {
  const { username } = req.cookies;
  const users = getUsers();
  if (username && users && users.includes(username)) {
    res.json({
      success: true,
      isLogin: true,
    });
  } else {
    res.json({
      success: false,
      isLogin: false,
    });
  }
});

module.exports = router;
