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

// function to save the encrypted document to IPFS. it should return the IPFS cid and a document Id
const uploadToIPFS = async (encryptedDocumemnt) => {
    return await new Promise((resolve, reject) => {
        axios.post('http://localhost:4000/uploadToIpfs', {
            dataToUpload: encryptedDocumemnt
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

// function to get the uid of the user
const getUserUIDFromDatabase = async (email) => {
    return await new Promise((resolve, reject) => {
        axios.get(`http://localhost:4002/useruid?email=${email}`)
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

// function to anchor the document by giving the document Id and IPFS cid 
//the document Id should look like this <User-uid>_<Document-id>
const anchorDocumentTransaction = async (userUid, documentId, cid) => {
    return await new Promise((resolve, reject) => {
        axios.post('http://localhost:4003/addbirthact', [`${userUid}_${documentId}`, cid])
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

// function to update the user data by adding the document Id to the documents of the user
const updateUserWithNewDocument = async (email, documentId) => {
    return await new Promise((resolve, reject) => {
        axios.post('http://localhost:4002/addnewdocumentusertodb', {
            email,
            documentId
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

const getAnchoredUserDocumentIpfsCidByAnchorKey = async (anchorKey) => {
    return await new Promise((resolve, reject) => {
        axios.get(`http://localhost:4003/getbirthact?hash=${anchorKey}`)
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

const getEncryptedDocumentDataFromIpfsByCid = async (cid) => {
    return await new Promise((resolve, reject) => {
        axios.get(`http://localhost:4000/getdata?cid=${cid}`)
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

const decryptUserDocument = async (encryptedData) => {
    return await new Promise((resolve, reject) => {
        axios.post(`http://localhost:3000/decryptdocdata`, {
            data:encryptedData
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

const processUserDocument = async (email, documentData) => {
    return await new Promise(async (resolve, reject) => {
        try {
            // 1- encrypt the document and make sure that documentData is a string 
            const encryptedDocumentData = await encryptDocument(documentData);
            const {data} = encryptedDocumentData

            // 2- upload the encrypted document to IPFS and get the docId and cid
            const ipfsData = await uploadToIPFS(data);
            const { docId, cid } = ipfsData;

            // 3- get the user uid for anchoring in next step
            const userUID = await getUserUIDFromDatabase(email);

            // 4- anchor the uploaded document transaction into Eth blockchain
            const transactionData = await anchorDocumentTransaction(userUID, docId, cid);

            // 5- we add the new document to the user documents and save to database
            if (transactionData && transactionData.hash != undefined) {
                const result = await updateUserWithNewDocument(email, docId);
                resolve({
                    processStatus: 'processing completed!',
                    result
                })
            }
        } catch (error) {
            reject({
                message: 'something went wrong during process!',
                errorMessage: error
            })
        }
    })
}

//function to retrieve and decrypt a user document
const retrieveAndProcessUserDocument = async (anchorKey) => {
    return await new Promise( async (resolve, reject) => {
        try {
            //1- grab the document cid from anchor
            const cidFromIpfs = await getAnchoredUserDocumentIpfsCidByAnchorKey(anchorKey);

            //2- retrieve the encrypted document from ipfs by cid
            const encryptedDocumentFromIpfs = await getEncryptedDocumentDataFromIpfsByCid(cidFromIpfs);
            const {data} = encryptedDocumentFromIpfs;

            //3- decrypt the doccument data 
            const decryptedDocument = await decryptUserDocument(data);
            console.log(decryptedDocument);

            resolve(decryptedDocument)

        } catch (error) {
            next(error)
        }
    })
}

app.get("/", (req, res) => {
    res.status(200).send(" wellcome to docidentity");
});

app.post("/uploaddocument", async (req, res) => {
    const { email, documentData } = req.body;
    try {
        const processResult = await processUserDocument(email, documentData);
        res.status(200).send(processResult);
    } catch (error) {
        next(error);
    }
});

app.get("/retrievedocument", async (req, res) => {
    const anchorkey = req.query.anchorkey;
    try {
        const document = await retrieveAndProcessUserDocument(anchorkey);
        res.status(200).send(document);
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });
  
  // Process event listeners
  process.on('uncaughtException', function(err) {
    console.error('Uncaught Exception:', err.stack);
  });
  
  process.on('unhandledRejection', function(reason, promise) {
    console.error('Unhandled Rejection:', reason.stack || reason);
  });

app.listen(port, () => {
    console.log(`docidentity service listening at http://localhost:${port}`);
});

