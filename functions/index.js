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
    checkAuthentication(context);
    dataValidator(data, {
      noteId: 'string',
      text: 'string'

    });
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

/*
creating validations
*/ 

function dataValidator(data, validKeys){
  if(Object.keys(data).length !== Object.keys(validKeys).length){
    throw new functions.https.HttpsError('Invalid-Argument',
    'Data Object contains invalid number of properties ');
  }else{
    for(let key in data){
      if(!validKeys[key] || typeof data[key] !== validKeys[key]){
        throw new functions.https.HttpsError('Invalid-Argument',
        'Data Object contains invalid properties ');
      }
    }
  }
}

function checkAuthentication(context){
  if(!context.auth){
    throw new functions.https.HttpsError('unauthenticated',
    'you must be signed in to use this feature');
  }
}



//firebase deploy --only functions
