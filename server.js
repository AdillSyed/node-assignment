const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const path = require("path");
const { response } = require("express");


const databasePath = path.join(__dirname, "users.sqlite3");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3011, () =>
      console.log("Server Running at http://localhost:3011/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

function authenticateToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}


app.get('/users/', async (req, res) => {
  const getQuery = `
    SELECT
      * 
    FROM
      userinfo;`;
  const user = await database.all(getQuery);
  response.status(200);
  res.send(user);
})

app.post("/users/", async (req, res) => {
  const userDetails = req.body;
  const { id, name, email, password } = userDetails;
  const postUserQuery = `
    INSERT INTO
      userinfo (id, name, email, password)
    VALUES
      (${id}, '${name}', '${email}', '${password}');`;
  await database.run(postUserQuery);
  res.send("User Updated");
});

app.post("/login/", async (request, response) => {
  const { name, password } = request.body;
  const selectUserQuery = `SELECT * FROM userinfo WHERE name = '${name}';`;
  const databaseUser = await database.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = password === databaseUser.password ? true: false;
    if (isPasswordMatched === true) {
      const payload = {
        username: name,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get('/users/', authenticateToken, async (req, res) => {
  const getUsers = `
    SELECT * FROM userinfo;`;
  const usersArray = await database.all(getUsers);
  res.status(200);
  res.send(usersArray);
})

module.exports = app;