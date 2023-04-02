const express = require("express");
const axios = require("axios");
const cors = require('cors');
const bodyParser = require("body-parser");

const port = process.env.PORT || 4005;

const app = express();

//  enable CORS for all origins
app.use(cors({
    origin: "*"
}));

app.use(bodyParser.json());

// function to encrypt the document data 
const encryptDocument = async (docData) => {
    return await new Promise((resolve, reject) => {
        axios.post('http://localhost:3000/encryptdocdata', {
            documentdata: docData
        })
            .then((response) => {
                console.log(response.data);
                resolve(response.data);
            })
            .catch((error) => {
                console.log(error);
                reject({
                    message: 'something went wrong!'
                })
            });
    })
}

// function to decrypt the document data
const decryptDocument = async (encryptedDoc) => {
    return await new Promise((resolve, reject) => {
        axios.post('http://localhost:3000/decryptdocdata', {
            encryptedDocumentData: encryptedDoc
        })
            .then((response) => {
                console.log(response.data);
                resolve(response.data);
            })
            .catch((error) => {
                console.log(error);
                reject({
                    message: 'something went wrong!'
                })
            });
    })
}

// function to save the encrypted document to IPFS. it should return the IPFS cid and a document Id
const uploadToIPFS = async (encryptedDocumemnt) => {
    return await new Promise((resolve, reject) => {
        axios.post('http://localhost:4000/uploadToIpfs',{
            dataToUpload:encryptedDocumemnt
        })
            .then((response) => {
                console.log(response.data);
                resolve(response.data);
            })
            .catch((error) => {
                console.log(error);
                reject({
                    message: 'something went wrong!'
                })
            });
    })

}

//TODO function to get the uid of the user

//TODO function to anchor the document by giving the document Id and IPFS cid 
//the document Id should look like this <User-uid>_<Document-id>

//TODO function to update the user data by adding the document Id to the documents of the user





app.get("/", (req, res) => {
    res.status(200).send(" wellcome to docidentity");
});

app.listen(port, () => {
    console.log(`docidentity service listening at http://localhost:${port}`);
});  

