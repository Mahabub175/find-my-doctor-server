require("dotenv").config();
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `${process.env.MONGO_URL}`;

app.use(cors());
app.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    const doctorsCollection = client
      .db("findMyDoctor")
      .collection("allDoctors");
    const usersCollection = client.db("findMyDoctor").collection("users");

    app.get("/doctors", async (req, res) => {
      try {
        const { specialty, location } = req.query;
        const query = {};

        if (specialty) {
          query.specialty = { $regex: specialty, $options: "i" };
        }

        if (location) {
          query.location = { $regex: location, $options: "i" };
        }
        const result = await doctorsCollection.find(query).toArray();

        res.send(result);
      } catch (error) {
        console.error("Internal Server Error", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/doctor/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await doctorsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.error("Internal Server Error", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.post("/users", async (req, res) => {
      try {
        const data = req?.body;
        const result = await usersCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        console.log("Internal Server Error", error);
      }
    });

    app.get("/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log("Internal Server Error", error);
      }
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Find My Doctor Server is running");
});

app.listen(port, () => {
  console.log(`This app listening at port ${port}`);
});
