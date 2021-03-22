// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const mimTypes = require('mimeTypes')
admin.initializeApp();

exports.createNote = functions.https.onCall(async (data,context) => {
checkAuthentication(context,true); //make sure admin is true
dataValidator(data,{
noteName: 'string',
authorId: 'string',
noteCover: 'string'
});
const mimeType = data.noteCover.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1];
const base64EncodedImageString = data.noteCover.replace(/^data:image\/\w+;base64,/, '');
const imageBuffer = new Buffer(base64EncodedImageString, 'base64');

const filename = `noteCovers/${data.bookName}.${mimeTypes.detectExtension(mimeType)}`;
const file = admin.storage().bucket().file(filename);
await file.save(imageBuffer, { contentType: 'image/jpeg' });
const fileUrl = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' }).then(urls => urls[0]);

return admin.firestore().collection('notes').add({
  //add new note here
  title: data.noteName,
  ImageUrl: fileUrl,
  author: admin.firestore().collection('authors').doc(data.authorId)
})
})

exports.createAuthor = functions.https.onCall(async(data,context) =>{
  checkAuthentication(context,true); //true : to check if the user is an admin

  dataValidator(data,{
    authorName: 'string'
  })

  const author = await admin.firestore().colliction('authors')
  .where('name','==',data.authorName )
  .limit(1)
  .get();

  if(!author.empty){
    throw new functions.https.HttpsError('already-exists',
    'this author already exists.')
  }

  //create new author
  return admin.firestore().colliction('authors').add({
    name: data.authorName
  });
});

exports.createPublicProfile = functions.https.onCall(async(data,context) => {
  checkAuthentication(context); //to make sure that user logged in before public profile created
  dataValidator(data,{
    username: 'string'
  });

  //assuming both of these two auth checks  pass
  const userProfile = await admin.firestore().collection('publicProfiles')
  .where('userId','==', context.auth.uid).limit(1)
  .get();
  if(userProfile.empty){
    throw new functions.https.HttpsError('already-exists',
    'this useralready has a public profile.')
  }

  const publicProfile = await admin.firestore().collection('publicProfiles').doc(data.username)
  .get();
  if(publicProfile.exists){
    throw new functions.https.HttpsError('already-exists',
    'this username already belongs to an existing user.')
  }

  const user = await admin.auth().getUser(context.auth.uid);
  if(user.email === functions.config().accounts.admin){
    //we want to assign custom claims
    await admin.auth().setCustomUserClaims(context.auth.uid, {admin: true});
  }

  return admin.firestore().collection('publicProfiles').doc(data.username).set({
      userId: context.auth.uid
    })
});
 
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

function checkAuthentication(context, admin){
  if(!context.auth){
    throw new functions.https.HttpsError('unauthenticated',
    'you must be signed in to use this feature');
  }else if(!context.auth.token.admin && admin){
    throw new functions.https.HttpsError('permission-denied',
    'you must be an admin to use this feature.');
  }
}



//firebase deploy --only functions
