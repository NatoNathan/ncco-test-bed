
const DC = process.env.DC ?? `eu-3.vonage.com`;
const API_HOST = process.env.API_HOST ?? `api-${DC}`;
const WS_HOST = process.env.WS_HOST ?? `ws-${DC}`;
const API_URL = process.env.API_URL ?? `https://${API_HOST}`;
const WS_URL = process.env.WS_URL ?? `wss://${WS_HOST}`;
const DEMO_APP_URL = process.env.DEMO_APP_URL ?? `http://localhost:3000`;

const rtcEvent = async (event, { logger, csClient }) => {

}

const voiceAnswer = async (req, res, next) => {
    const { config, logger, storageClient } = req.nexmo;

    const fromUser = req.body.from_user;
    const toUser = await storageClient.get(fromUser);
    logger.info(`from: ${fromUser} to:${toUser}`);

    return res.json([
        { action: 'talk', text: `Please wait for ${toUser} to answer...` },
        {
            action: "connect",
            // randomFromNumber: true,
            endpoint: [
                {
                    type: "app",
                    user: toUser
                }
                // {
                //     type: "phone",
                //     number: "447375529333"
                // }
            ]
        },
        { action: 'talk', text: `${toUser} has connected` },
    ]);
};

const voiceEvent = async (req, res, next) => {
    const { logger } = req.nexmo;
    try {
        logger.info("event", { event: req.body });
        res.json({});
    } catch (err) {
        logger.error("Error on voiceEvent function")
    }
}

/**
 * 
 * @param {object} app - this is an express app
 * you can register and handler same way you would do in express. 
 * the only difference is that in every req, you will have a req.nexmo variable containning a nexmo context
 * 
 */
const route = (app) => {
    app.post('/call', async (req, res) => {
        const {
            logger,
            generateUserToken,
            storageClient,
            csClient
        } = req.nexmo;

        const getUser = async name => {
            try {
                const userListRes = await csClient({
                    url: `${API_URL}/v0.3/users?name=${name}`,
                    method: "GET",
                });
                const user = userListRes?.data?._embedded?.users[0];
                return getUserTokenInfo(name);
            } catch (error) {
                return await getNewUser(name);
            }

        };

        const getNewUser = async name => {
            await csClient({
                url: `${API_URL}/v0.3/users`,
                method: 'post',
                data: {
                    name: name,
                    display_name: name,
                }
            });

            return getUserTokenInfo(name);
        };

        const getUserTokenInfo = name => {
            const token = generateUserToken(name);
            return {
                name,
                token,
                demoAppUrl: getDemoAppURL(name, token)
            }
        };

        const getDemoAppURL = (name, token) => {
            return DEMO_APP_URL + '/login/basic?' + new URLSearchParams({
                'token': token, 'dc': 'eu-west-1'
            }).toString();
        }

        const { from, to } = req.body;
        await storageClient.set(from, to);

        const fromUserInfo = await getUser(from);
        const toserInfo = await getUser(to);

        res.json({
            from: fromUserInfo,
            to: toserInfo
        });
    })
}



module.exports = {
    voiceAnswer,
    voiceEvent,
    route
}
