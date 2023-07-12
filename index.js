const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const authentication = (request, response, next) => {
  let jwtToken;
  const authHead = request.headers["authorization"];
  if (authHead !== undefined) {
    jwtToken = authHead.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401);
    response.send("invalid jwt token");
  } else {
    jwt.verify(jwtToken, "my_secretKey", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("error jwt token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashPassword = await bcrypt.hash(password, 10);
  const getUserNameQuery = `select * from user where username = '${username}';`;
  const userDb = await db.get(getUserNameQuery);

  if (userDb === undefined) {
    const postQuery = `
      INSERT INTO 
           user 
      (username, name, password, gender, location)
      VALUES (
          '${username}',
          '${name}',
          '${hashPassword}',
          '${gender}',
          '${location}'
      );`;
    const dbResponse = await db.run(postQuery);
    const newUserId = dbResponse.lastId;
    response.send(newUserId);
    response.send("user successful register");
  } else {
    response.status(400);
    response.send("user already exist");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `select * from user where username = '${username}';`;

  const userDb = await db.get(getUserQuery);
  const isPasswordMatch = await bcrypt.compare(password, userDb.password);

  if (isPasswordMatch === true) {
    const payload = { username: username, password: password };
    const jwtToken = jwt.sign(payload, "my_secretKey");
    response.send({ jwtToken });
  } else {
    response.status(400);
    response.send("invalid password");
  }
});

app.get("/books/", authentication, async (req, res) => {
  const getUserQuery = `
    select * from book ;`;
  const userArray = await db.all(getUserQuery);
  res.send(userArray);
});

app.get("/profile/", authentication, async (request, response) => {
  const { username } = request;
  const getUserQuery = `select * from user where username='${username}';`;
  const userData = await db.get(getUserQuery);
  response.send(userData);
});
