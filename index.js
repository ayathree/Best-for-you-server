const express = require( 'express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;

// middleware

const corsOptions ={
    origin:["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    optionSuccessStatus: 200

}
  app.use(cors(corsOptions));
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ycbv1lf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const productsCollection = client.db('alterDB').collection('products')

    // save a product data in database
   app.post('/products',async(req,res)=>{
    const productData = req.body;
    console.log(productData)
    
    const result = await productsCollection.insertOne(productData)
    res.send(result)
 })
 // get all products added by a spacific user
 app.get('/products/:email',async(req,res)=>{
  const email = req.params.email
  const query = {'queryUser.email':email}

  const result = await productsCollection.find(query).sort({ _id: -1 }).toArray()
  
  res.send(result)
})
// get a single product data from db using id
app.get('/product/:id', async(req,res)=>{
  const id = req.params.id
  const query = {_id: new ObjectId(id)}
  const result = await productsCollection.findOne(query)
  res.send(result)

})
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('server is running best for you')
})

app.listen(port,()=>{
    console.log(`server is running on port:${port}`)
})