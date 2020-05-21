const functions = require('firebase-functions');
const express = require('express');
const app = express();
const admin = require('firebase-admin');

admin.initializeApp({credential: admin.credential.cert(require('./key/admin.json'))})

const db = admin.firestore();
// // Create and Deploy Your First Cloud Functions
// https:firebase.google.com/docs/functions/write-firebase-functions

const firebaseConfig = {
    apiKey: "AIzaSyAXq8P97LhA0vXa_zGff9KkbcxYXnNLPhw",
    authDomain: "socialape-d0025.firebaseapp.com",
    databaseURL: "https://socialape-d0025.firebaseio.com",
    projectId: "socialape-d0025",
    storageBucket: "socialape-d0025.appspot.com",
    messagingSenderId: "447528917572",
    appId: "1:447528917572:web:7c4bb37db188e73a1e3a11",
    measurementId: "G-YBW8V035E4"
  };

const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

app.get('/screams',(req,res) => {
    db
    .collection('screams')
    .orderBy('createdAt','desc')
    .get()
    .then(data => {
        let screams = [];
        data.forEach((doc) => {
            screams.push({
                screamId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: new Date().toISOString()
            });
        });
        return res.json(screams);
    })
    .catch((err) => console.error(err));
})

const FBAuth = (req, res, next) => {
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken = req.headers.authorization.split('Bearer ')[1];
    }
    else{
        return res.status(403).json({
            error: "Unauthorized"
        });
    }
    admin
    .auth()
    .verifyIdToken(idToken)
    .then(decodedToken => {
        req.user = decodedToken;
        return db
        .collection('users')
        .where('userId', '==', req.user.uid)
        .limit(1)
        .get();
    })
    .then(data => {
        req.user.handle = data.docs[0].data().handle;
        return next();
    })
    .catch(err => {
        console.error('Error while verifying token', err);
        return res.status(403).json({err});
    })
};

app.post('/screams', FBAuth, (req,res) => {
    const newScream = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        userHandle: req.user.handle
    };
    db
    .collection('screams')
    .add(newScream)
    .then(doc => {
        console.log("running successfully")
        res.json({message: `document ${doc.id} created successfully`});
    })
    .catch(err => {
        res.status(500).json({
            error: 'something went wrong'
        });
        console.error(err);
    })
});

// Helper Functions
const isEmpty = (s) => {
    if(s.trim() === ''){
        return true;
    }
    else{
        return false;
    }
}
const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(regEx)){
        return true;
    }
    else{
        return false;
    }
}

// Signup Route

app.post('/signup',(req,res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    // Validate for empty data
    let errors = {};
    if(isEmpty(newUser.email)){
        errors.email = "Must not be empty";
    }
    else if(!isEmail(newUser.email)){
        errors.email = "Must be a valid email adress";
    }
    if(isEmpty(newUser.password)){
        errors.password = "Must not be empty";
    }
    if(newUser.password !== newUser.confirmPassword){
        errors.confirmPassword = "Passwords must match";
    }
    if(isEmpty(newUser.handle)){
        errors.handle = "Must not be empty";
    }
    if(Object.keys(errors).length > 0){
        return res.status(400).json(errors);
    }

    // validate data
    let token,userId;
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
        if(doc.exists){
            return res.status(400).json({
                handle: 'This handle is already taken'
            });
        }
        else{
            return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password)
        }
    })
    .then(data => {
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    .then(idToken => {
        token = idToken;
        const userCredentials = {
            handle: newUser.handle,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            userId
        };
        return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
        return res.status(201).json({ token });
    })
    .catch(err => {
        if(err.code === 'auth/email-already-in-use'){
            return res.status(400).json({
                email: 'This email is already taken'
            });
        }
        else{
            return res.status(500).json({error: err.code});
        }
    })
});

app.post('/login',(req,res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    let errors = {};
    
    if(isEmpty(user.email)){
        errors.email = "Must not be empty";
    }
    else if(!isEmail(user.email)){
        errors.email = "Must be a valid email adress";
    }
    if(isEmpty(user.password)){
        errors.password = "Must not be empty";
    }
    if(Object.keys(errors).length > 0){
        return res.status(400).json(errors);
    }

    firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
        return data.user.getIdToken();
    })
    .then(token => {
        return res.json({token});
    })
    .catch(err => {
        if(err.code === 'auth/wrong-password'){
            return res.status(403).json({
                general: "Wrong credentials, please try again"
            })
        }
        else{
            res.status(500).json({
                error: err.code
            });
         }
    }) 
})
exports.api = functions.https.onRequest(app);