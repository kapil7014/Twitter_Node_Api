import serverlessApp from 'serverless-http';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';
import AWS from 'aws-sdk';
import { sign } from 'jsonwebtoken';
import swaggerUi from 'swagger-ui-express';
import Utility from './utility/utility';

AWS.config.update({
    region: 'us-east-1',
});

//.env config for read file
dotenv.config();
const app = express();

//Allow cors
app.use(cors());

//Express json
app.use(express.json());

const utility = new Utility();
const SERVER_PORT = process.env.PORT;
const apiKey = process.env.API_Key || "";
const swaggerDocument = require('./swagger.json');
const apiBaseUrl = process.env.TwitterApiUrl || "";
const dynamoDbDocClient = new AWS.DynamoDB.DocumentClient();

//Generate API secreats key for access the auth layer api
app.get('/secret-api-key', (req: any, res: any) => {
    let token = sign({ "body": "stuff" }, apiKey, { algorithm: 'HS256' });
    res.send(token);
});

//Login with azure ad and return URL for get user token
app.get('/TwitterLoginUrl', utility.isAuthenticated, (req: any, res: any) => {
    const twitterLoginUrl = process.env.TwitterAuthorizeUrl + "?response_type=code&client_id=" + process.env.ClientKeyId + "&redirect_uri=" + process.env.CallBackUrl +
        "&scope=" + encodeURIComponent(process.env.TwitterScopes || "") + "&state=state&code_challenge=challenge&code_challenge_method=plain";
    res.status(200).send({ loginUrl: twitterLoginUrl });
});

//Get logged in user details using query token
app.get('/GetTwitterAccessToken', utility.isAuthenticated, async (req: any, res: any,) => {
    const encodedClientSecret = encodeURIComponent(process.env.ClientSecretKey || "");
    const encodedClientKey = encodeURIComponent(process.env.ClientKeyId || "");
    const combinedKeys = encodedClientKey + ":" + encodedClientSecret;
    const secretKeyBase64 = Buffer.from(combinedKeys, "utf8").toString('base64');

    axios.post(apiBaseUrl + "2/oauth2/token", new URLSearchParams({
        client_id: process.env.ClientKeyId || "",
        code_verifier: "challenge", grant_type: "authorization_code",
        redirect_uri: process.env.CallBackUrl || "", code: req.query.code
    }).toString(), {
        headers: {
            ContentType: 'application/x-www-form-urlencoded',
            Authorization: 'Basic '.concat(secretKeyBase64)
        }
    }).then(response => {
        res.status(200).send(response.data);
    }).catch((error) => {
        res.status(400).send(error);
    });
});

//Get twitter logged in user token details
app.get('/GetTwitterAuthUser', utility.isAuthenticated, async (req: any, res: any,) => {
    axios.get(apiBaseUrl + "2/users/me?user.fields=profile_image_url", {
        headers: {
            Authorization: req.headers.authorization
        }
    }).then(response => {
        res.status(200).send(response.data);
    }).catch((error) => {
        res.status(400).send(error);
    });
});

//Get twitter timeline tweets
app.get('/GetReverseTimelineTweets', utility.isAuthenticated, async (req: any, res: any,) => {
    const queryParams = new URLSearchParams({
        "tweet.fields": "entities,created_at,attachments",
        "expansions": "attachments.media_keys,author_id",
        "user.fields": "profile_image_url,name,username",
        "media.fields": "preview_image_url,url",
        "place.fields": "full_name"
    }).toString();
    axios.get(apiBaseUrl + "2/users/" + req.query.userId + "/timelines/reverse_chronological?" + queryParams, {
        headers: {
            Authorization: req.headers.authorization
        }
    }).then(response => {
        res.status(200).send(response.data);
    }).catch((error) => {
        res.status(400).send(error);
    });
});

//Add swagger in express
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//Set port for run the application
app.listen(SERVER_PORT, () => {
    console.log(`Twitter API POC is Running on Port ${SERVER_PORT}.`);
});

export = serverlessApp(app);