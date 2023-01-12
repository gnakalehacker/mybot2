const TelegramBot = require('node-telegram-bot-api');
const firebaseAdmin = require('firebase-admin');
const CoinbaseCommerce = require('coinbase-commerce-node');

// Initialize Telegram bot
const token = '5723275491:AAH5Q7-dh2Vo2UNWJAQngFhzrb49wCwXIUA';
const bot = new TelegramBot(token, { polling: true });
// Replace API_KEY with your own Coinbase Commerce API key
const client = CoinbaseCommerce.Client.init('872ffd29-35ce-45bd-b68b-87adb3da49c4');

// Initialize Firebase
firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert('./firebase-credentials.json'),
    databaseURL: 'https://shopifybot-ccf09-default-rtdb.europe-west1.firebasedatabase.app/',
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.last_name;

    bot.sendMessage(chatId, `Welcome to my Telegram bot, ${userName}! How can I help you?`);

    const buttons = [
        {
            text: 'NumList 🔢',
            callback_data: 'numList'
        },
        {
            text: 'Scammas 📁',
            callback_data: 'scammas'
        },
        {
            text: 'MailList📧',
            callback_data: 'mailist',
        },
        {
            text: 'Plesk 🌐',
            callback_data: 'Plesk'
        },
        {
            text: 'CC-Fresh 💳',
            callback_data: 'ccfresh',
        },
        {
            text: 'My Account 👨‍💻',
            callback_data: 'myaccount'
        }
    ];
    const buttonList = [];
    for (let i = 0; i < buttons.length; i += 2) {
        buttonList.push([buttons[i], buttons[i + 1]]);
    }
    const markup = {
        inline_keyboard: buttonList
    };
    bot.sendMessage(chatId, 'Here is a list of buttons:', { reply_markup: markup });
});
bot.on('callback_query', async (callbackQuery) => {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;

    if (data === 'myaccount') {
        const buttons = [
            {
                text: 'Register',
                callback_data: 'register'
            },
            {
                text: 'Recharge Account',
                callback_data: 'recharge'
            }
        ];
        const buttonList = [];
        for (let i = 0; i < buttons.length; i += 2) {
            buttonList.push([buttons[i], buttons[i + 1]]);
        }
        const markup = {
            inline_keyboard: buttonList
        };
        bot.sendMessage(chatId, 'Here are the available options:', { reply_markup: markup });
    }
    if (data === 'register') {
        // Check if the user already exists in the database
        firebaseAdmin.database().ref(`users/${userId}`).once('value', (snapshot) => {
            if (snapshot.exists()) {
                bot.sendMessage(chatId, 'Your account has already been registered.');
            } else {
                // Generate a unique user ID
                const userId = firebaseAdmin.database().ref().child('users').push().key;
                // Retrieve user's name and email address from their Telegram profile information
                const userData = {
                    username: callbackQuery.from.username,
                    firstName: callbackQuery.from.first_name,
                    lastName: callbackQuery.from.last_name,
                    balance: 0
                };
                // Save the user's data to the database
                firebaseAdmin.database().ref(`users/${userId}`).set(userData);
                bot.sendMessage(chatId, 'Your account has been registered successfully.');
            }
        });
    }
    if (data === 'recharge') {
        // Create a new order for the user
        const order = await client.orders.create({
            name: 'Account recharge',
            description: `Recharge account for user ${userId}`,
            local_price: {
                amount: '10.00',
                currency: 'USD'
            },
            metadata: {
                userId: userId
            }
        });
        // Send the order URL to the user
        bot.sendMessage(chatId, `Please click on the following link to recharge your account: ${order.hosted_url}`);
        // Handle the order status change
        order.on('status_changed', async(status) => {
            if (status === 'completed') {
                // Retrieve the metadata of the order
                const orderMetadata = order.metadata;
                // Retrieve the user ID
                const userId = orderMetadata.userId;
                // Retrieve the user account balance
                let userAccount = await firebaseAdmin.database().ref(`users/${userId}/balance`).once('value');

                userAccount = userAccount.val();
                // Update the user account balance
                await firebaseAdmin.database().ref(`users/${userId}/balance`).set(userAccount + 10);
                bot.sendMessage(chatId, "Recharge effectué avec succès");
            }
        });
    }
});
