import express from 'express';
import bodyParser from 'body-parser';
// Set up the express app
const app = express();
// Parse incoming requests data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// setup PORT for the API to run
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
});

//create API endpoints 
app.get('/api/v1/info', (request, response) => {
    response.status(200).send({
        info: [`This is the info request.`,
            `This API is a simple emulation of a banking api.`,
            `You can `,
            `  * see public information, eg interest rates`,
            `  * login`,
            `  * see your accounts and balances`,
            `  * see your account's list of recent transactions`,
            `  * transfer money between accounts now`,
            `  * schedule a transfer for the future`,
            `  * see a list of bills`,
            `  * pay a bill`,
            `  * pay someone`
        ],
        requests: [
            '/api/v1/info - this call',
            '/api/v1/rates - list of interest rates',
            '/api/v1/rates/info - more details',
            '/api/v1/person - more details',
            '/api/v1/status - indicates if API is up or not',
        ]
    });
});

app.get('/api/v1/status', (request, response) => {
    response.status(200).send({
        APIstatus: `up`
    });
});

const rates = [
    {
        rateId: 5,
        accountType: 'cheque',
        rate: 1.32
    },
    {
        rateId: 1,
        accountType: 'overdraft',
        rate: 8.32
    },
    {
        rateId: 2,
        accountType: 'loanFixed12Months',
        rate: 4.32
    },
    {
        rateId: 3,
        accountType: 'loanFixed24Months',
        rate: 3.32
    },
    {
        rateId: 4,
        accountType: 'savings',
        rate: 2.32
    }
]
app.get('/api/v1/rates/info', (request, response) => {
    response.status(200).send({
        info: [`This is the rates request and contains list of interest rates`,
            `Each item has format`,
            "{",
            " 'rateId': number,",
            " 'accountType': 'string, one of: cheque, overdraft, loanFixed12Months, loanFixed24Months',",
            " 'rate': 'a number 0.00-100.00'",
            "}"
        ]
    });
});
app.get('/api/v1/rates', (request, response) => {
    response.status(200).send(rates);
});
app.get('/api/v1/rate/:rateId', (request, response) => {
    const rateId = request && request.params && parseInt(request.params.rateId)
    if(rateId){
        if(rates[rateId]){
            response.status(200).send(rates[rateId])
        }else{
            response.status(404).send({message: `Error: rateId ${rateId} could not be found`})
        }
    }else{
        response.status(400).send({message: `Error: missing or invalid rateId ${request && request.params && request.params.rateId} `})
    }
});

app.get('/api/v1/person', (request, response) => {
    return response.status(200).send({
        info: [`This is the person info request.`,
            `All calls with a context of person start with this root path`
        ],
        requests: [
            `/api/v1/person - this call`,
            `/api/v1/person/login - login`,
            `/api/v1/person/accounts - user's list of accounts`,
        ]
    })
});

const protectedRoutes = [
    `GET /api/v1/person/accounts - list of the users accounts with general details`,
    `GET /api/v1/person/account/{{accountId}}/transactions - list transactions for the selected account`,
    `DELETE /api/v1/person/login - delete the user's session`,
]
app.get('/api/v1/person/login', (request, response) => {
    return response.status(200).send({
        info: [`Use POST /api/v1/person/login `,
            `with body below`,
            `all subsequent calls to protected routes must include header 'sessionId' with value of the sessionId returned`
        ],
        body: {
            name: 'string',
            password: 'string'
        },
        protectedRoutes: protectedRoutes
    })
});

class Sessions {
    constructor() {
        this.list = [];
    }
    add(newSession) {
        let currentSession = this.list.find(session => session.name === newSession.name)
        if (currentSession) {
            return currentSession.sessionId
        } else {
            newSession.sessionId = Math.random().toString()
            this.list.push(newSession)
            return newSession.sessionId
        }
    }
    get(sessionId) {
        return this.list.find(session => session.sessionId === sessionId)
    }
    delete(session){
        const delIndex = this.list.findIndex(sess => sess.sessionId === session.sessionId)
        this.list.splice(delIndex,1);
    }
}
let sessions = new Sessions;

app.post('/api/v1/person/login', (request, response) => {
    const name = request && request.body && typeof request.body.name === 'string' && request.body.name
    const password = request && request.body && typeof request.body.password === 'string' && request.body.password
    if (!name || !password) {
        return response.status(400).send({
            msg: [
                `Error: Missing parameter(s)`,
                `${!name && 'name'} ${!password && 'password'}`,
            ]
        })
    }

    if (password === `Password123`) { // hard code for now
        return response.status(200).send({
            sessionId: sessions.add(request.body),
            protectedRoutes: protectedRoutes
        })
    } else {
        return response.status(403).send({
            msg: [
                `Error: incorrect name or password`
            ]
        })
    }

});
app.delete('/api/v1/person/login', (request, response) => {
    let currentSession = sessions.get(request.headers.sessionid);
    if (currentSession) {
        sessions.delete(currentSession)
        return response.status(204).send()
    } else {
        return response.status(403).send({
            msg: [
                `Error: not a valid session`
            ]
        })
    }
});

let accounts = [
    {
        accountId: 6,
        type: "cheque",
        number: "123-45678-90123234-000",
        name: "Bob's business",
        balance: -123.45,
        rateId: 5,
        links:[
            {transactions: '/api/v1/person/account/6/transactions'},
            {rate: '/api/v1/rate/5'}
        ]
    },
    {
        accountId: 2,
        type: "savings",
        number: "123-45678-90123234-001",
        name: "rainy days",
        balance: 1230.45,
        rateId: 4,
        links:[
            {transactions: '/api/v1/person/account/2/transactions'},
            {rate: '/api/v1/rate/4'}
        ]
    },
    {
        accountId: 3,
        type: "overdraft",
        number: "123-45678-90123234-001",
        name: "Household Expenses",
        balance: 123.45,
        rateId: 1,
        links:[
            {transactions: '/api/v1/person/account/3/transactions'},
            {rate: '/api/v1/rate/1'}
        ]
    },
    {
        accountId: 4,
        type: "loanFixed12Months",
        number: "123-45678-90123234-100",
        name: "Family Home Mortgage #1",
        balance: -100123.45,
        rateId: 2,
        links:[
            {transactions: '/api/v1/person/account/4/transactions'},
            {rate: '/api/v1/rate/2'}
        ]
    },
    {
        accountId: 5,
        type: "loanFixed24Months",
        number: "123-45678-90123234-200",
        name: "Family Home Mortgage #2",
        balance: -500123.45,
        rateId: 3,
        links:[
            {transactions: '/api/v1/person/account/5/transactions'},
            {rate: '/api/v1/rate/3'}
        ]
    }
]

app.get('/api/v1/person/accounts', (request, response) => {
    let currentSession = sessions.get(request.headers.sessionid);
    if (currentSession) {
        return response.status(200).send(accounts) // hard code same list of accounts for all users for now
    } else {
        return response.status(403).send({
            msg: [
                `Error: not a valid session`
            ]
        })
    }
});

function randomTransactions(){
    const _30Days = 30*24*60*60*1000
    const _30DaysAgo = new Date(new Date - _30Days)
    return Array.from({length: 30}, () => ({
        date: new Date(Math.round(_30DaysAgo.valueOf() + _30Days * Math.random())),
        details: ` - any old details -`,
        ammount: Math.round(10000-20000*Math.random())/100
    })).sort((a,b) => a.date - b.date)
}

app.get('/api/v1/person/account/:accountId/transactions', (request, response) => {
    let currentSession = sessions.get(request.headers.sessionid);
    if (currentSession) {
        return response.status(200).send(randomTransactions()) // hard code same list of accounts for all users for now
    } else {
        return response.status(403).send({
            msg: [
                `Error: not a valid session`
            ]
        })
    }
});
