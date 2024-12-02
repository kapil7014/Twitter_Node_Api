import { verify } from 'jsonwebtoken';

export default class Utility {
    //Verify Token  
    public verifyToken(req: any, res: any, next: any) {
        //Get authorization header value  
        const bearerHearder = req.headers['authorization'];
        //check if bearer is undefined  
        if (typeof bearerHearder != 'undefined') {
            //split at the space  
            const bearer = bearerHearder.split(' ');
            //Get the token from array  
            const bearerToken = bearer[1];
            // set the token  
            req.token = bearerToken;
            //Next middleware  
            next();
        } else {
            res.sendStatus(403);
        }
    }

    //Check API is authorised or not
    public isAuthenticated(req: any, res: any, next: any) {
        if (typeof req.headers.hasOwnProperty("client_key") && typeof req.headers.client_key !== "undefined") {
            // Retrieve the authorization key and check out
            let token = req.headers.client_key;

            // Here we validate that the JSON Web Token is valid and has been 
            const verifyOptions: any = {
                algorithms: ['HS256']
            };

            // created using the same private pass phrase
            verify(token, process.env.API_Key || "", verifyOptions, (err, user) => {
                // if there has been an error
                if (err) {
                    res.status(500).json({ error: "Not Authorized" });
                }
                // if the JWT Token is valid, allow them to hit the intended endpoint
                return next();
            });
        } else {
            // No authorization header exists on the incoming (request, return not authorized)
            res.status(500).json({ error: "Not Authorized, Client Key - not available" });
        }
    }
}