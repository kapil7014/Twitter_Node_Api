"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const serverless_http_1 = __importDefault(require("serverless-http"));
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const axios_1 = __importDefault(require("axios"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const jsonwebtoken_1 = require("jsonwebtoken");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const utility_1 = __importDefault(require("./utility/utility"));
aws_sdk_1.default.config.update({
    region: 'us-east-1',
});
//.env config for read file
dotenv_1.default.config();
const app = (0, express_1.default)();
//Allow cors
app.use((0, cors_1.default)());
//Express json
app.use(express_1.default.json());
const utility = new utility_1.default();
const SERVER_PORT = process.env.PORT;
const apiKey = process.env.API_Key || "";
const swaggerDocument = require('./swagger.json');
const apiBaseUrl = process.env.TwitterApiUrl || "";
const dynamoDbDocClient = new aws_sdk_1.default.DynamoDB.DocumentClient();
//Generate API secreats key for access the auth layer api
app.get('/secret-api-key', (req, res) => {
    let token = (0, jsonwebtoken_1.sign)({ "body": "stuff" }, apiKey, { algorithm: 'HS256' });
    res.send(token);
});
//Login with azure ad and return URL for get user token
app.get('/TwitterLoginUrl', utility.isAuthenticated, (req, res) => {
    const twitterLoginUrl = process.env.TwitterAuthorizeUrl + "?response_type=code&client_id=" + process.env.ClientKeyId + "&redirect_uri=" + process.env.CallBackUrl +
        "&scope=" + encodeURIComponent(process.env.TwitterScopes || "") + "&state=state&code_challenge=challenge&code_challenge_method=plain";
    res.status(200).send({ loginUrl: twitterLoginUrl });
});
//Get logged in user details using query token
app.get('/GetTwitterAccessToken', utility.isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const encodedClientSecret = encodeURIComponent(process.env.ClientSecretKey || "");
    const encodedClientKey = encodeURIComponent(process.env.ClientKeyId || "");
    const combinedKeys = encodedClientKey + ":" + encodedClientSecret;
    const secretKeyBase64 = Buffer.from(combinedKeys, "utf8").toString('base64');
    axios_1.default.post(apiBaseUrl + "2/oauth2/token", new URLSearchParams({
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
}));
//Get twitter logged in user token details
app.get('/GetTwitterAuthUser', utility.isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    axios_1.default.get(apiBaseUrl + "2/users/me?user.fields=profile_image_url", {
        headers: {
            Authorization: req.headers.authorization
        }
    }).then(response => {
        res.status(200).send(response.data);
    }).catch((error) => {
        res.status(400).send(error);
    });
}));
//Get twitter timeline tweets
app.get('/GetReverseTimelineTweets', utility.isAuthenticated, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const queryParams = new URLSearchParams({
        "tweet.fields": "entities,created_at,attachments",
        "expansions": "attachments.media_keys,author_id",
        "user.fields": "profile_image_url,name,username",
        "media.fields": "preview_image_url,url",
        "place.fields": "full_name"
    }).toString();
    axios_1.default.get(apiBaseUrl + "2/users/" + req.query.userId + "/timelines/reverse_chronological?" + queryParams, {
        headers: {
            Authorization: req.headers.authorization
        }
    }).then(response => {
        res.status(200).send(response.data);
    }).catch((error) => {
        res.status(400).send(error);
    });
}));
//Add swagger in express
app.use('/', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocument));
//Set port for run the application
app.listen(SERVER_PORT, () => {
    console.log(`Twitter API POC is Running on Port ${SERVER_PORT}.`);
});
module.exports = (0, serverless_http_1.default)(app);
