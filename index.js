const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhu2zmw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const partsCollection = client.db('camera-parts-manufacturer').collection('parts');
        const orderCollection = client.db('camera-parts-manufacturer').collection('orders');
        const userCollection = client.db('camera-parts-manufacturer').collection('users');

        app.get('/parts', async (req, res) => {
            const query = {};
            const parts = await partsCollection.find(query).toArray();
            res.send(parts);
        })

        app.get('/parts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const part = await partsCollection.findOne(query);
            res.send(part);
        })

        app.get('/order', verifyJWT, async (req, res) => {
            const userEmail = req.query.userEmail;
            const decodedEmail = req.decoded.userEmail;
            if (userEmail === decodedEmail) {
                const query = { userEmail: userEmail };
                const result = await orderCollection.find(query).toArray();
                return res.send(result);
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' });
            }

        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        app.put('/user/:userEmail', async (req, res) => {
            const userEmail = req.params.userEmail;
            const user = req.body;
            const filter = { userEmail: userEmail };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ userEmail: userEmail }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            res.send({ result, token });
        })
    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server is running');
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
