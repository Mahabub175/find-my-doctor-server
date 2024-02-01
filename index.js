require("dotenv").config();
const express = require("express");
const cors = require("cors");
const SSLCommerzPayment = require("sslcommerz-lts");
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

const store_id = `${process.env.STORE_ID}`;
const store_passwd = `${process.env.STORE_PASS}`;
const is_live = false;

async function run() {
  try {
    const doctorsCollection = client
      .db("findMyDoctor")
      .collection("allDoctors");
    const usersCollection = client.db("findMyDoctor").collection("users");
    const appointmentCollection = client
      .db("findMyDoctor")
      .collection("appointments");

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

    app.post("/doctor", async (req, res) => {
      try {
        const data = req?.body;
        const result = await doctorsCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        console.log("Internal Server Error", error);
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

    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const result = await usersCollection.find(query).toArray();
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

    app.put("/user/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              isDeleted: true,
            },
          }
        );

        res.send(result);
      } catch (error) {
        console.error(error);
      }
    });

    app.post("/appointments", async (req, res) => {
      try {
        const data = req?.body;
        const result = await appointmentCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        console.log("Internal Server Error", error);
      }
    });

    app.get("/appointments/:email", async (req, res) => {
      try {
        const userEmail = req.params.email;
        const query = { email: userEmail };

        const result = await appointmentCollection.find(query).toArray();

        res.json(result);
      } catch (error) {
        console.error("Internal Server Error", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/appointments", async (req, res) => {
      try {
        const result = await appointmentCollection.find().toArray();
        res.json(result);
      } catch (error) {
        console.error("Internal Server Error", error);
        res.status(500).send("Internal Server Error");
      }
    });

    const trans_id = new ObjectId().toString();

    app.post("/payment", (req, res) => {
      const body = req.body;
      const data = {
        total_amount: body.price,
        currency: "BDT",
        tran_id: trans_id,
        success_url: `${process.env.BASE_URL}/payment/success/${body.id}`,
        fail_url: "http://localhost:5000/fail",
        cancel_url: "http://localhost:5000/cancel",
        ipn_url: "http://localhost:5000/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: "Customer Name",
        cus_email: body.email,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
      });

      app.post("/payment/success/:id", async (req, res) => {
        try {
          const id = req.params.id;
          const result = await appointmentCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                status: "paid",
              },
            }
          );

          if (result.modifiedCount > 0) {
            res.redirect(`${process.env.CLIENT_URL}/dashboard/bookings`);
          }
        } catch (error) {
          console.error(error);
        }
      });
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
