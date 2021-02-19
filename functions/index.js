// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const functions = require('firebase-functions');


const admin = require('firebase-admin');
admin.initializeApp();
 
exports.postComment = functions.https.onCall(async(data, context) => {
    const db = admin.firestore();
    const snapshot = await db
    .collection('publicProfiles')
    .where('userId', '==', context.auth.uid)
    .limit(1)
    .get();
       
    await db.collection('comments').add({
      text: data.text,
      username: snapshot.docs[0].id,
      dataCreated: new Date(),
      note: db.collection('notes').doc(data.noteId)
 });
});



//firebase deploy --only functions
