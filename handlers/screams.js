const {db} = require('../util/admin');

exports.getAllScreams = (req,res) => {
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
                createdAt: new Date().toISOString(),
                commentCount: doc.data().commentCount,
                likeCount: doc.data().likeCount
            });
        });
        return res.json(screams);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).json({error: err.code});
    });
}

exports.postOneScream = (req,res) => {
    const newScream = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        userHandle: req.user.handle
    };
    db
    .collection('screams')
    .add(newScream)
    .then(doc => {
        res.json({message: `document ${doc.id} created successfully`});
    })
    .catch(err => {
        res.status(500).json({
            error: 'something went wrong'
        });
        console.error(err);
    })
}

