const express = require('express');
const db = require('./db');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload =multer();
const app = express();
require('dotenv').config();
const morgan = require('morgan');
const port = process.env.PORT || 8080;

app.use(morgan('dev'));
app.get('/',function(req,res){
    res.render('INDEX PAGE');
});
app.set('view engine','pug');
app.set('views','./views');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(upload.array());
app.use(express.static('public'));


app.get('/rohit',async function(req,res){
    try{
        const result=await db.query('SELECT * FROM users;');
        res.status(200).json({
            status:"success",
            data:{
                users: result.rows,
            },
        });
        
    }catch(err){
    console.log(err);
    }
 
});


app.get('/questions',async function(req,res){
    try{
        const questions=await db.query('SELECT * FROM questions;');
        // console.log(questions);
        const options=await db.query(`SELECT * FROM options`);
        // console.log(options);
        res.render('question',{
            questionText:questions.rows,
            optionText:options.rows
        });
    }catch(err){
        console.log(err);
    }
});
app.post('/question',async function(req,res){
    try{
        const answers = req.body;
        const userName=req.body.userName;
        const questions=[];
        const everyAnswers=[];
        var questionBool = true;
        var questionNum=0;
        var rightAnswerNum=0;
        var ifPass=true;
        const userNameCheck= await db.query('SELECT password FROM users where username= $1',[userName]);
        if(userNameCheck.rowCount==0 ||userNameCheck.rows[0].password!=req.body.userPass){
            console.log("No user with given credentials found");
            return res.redirect('/questions');
        }

        Object.entries(answers).forEach(([key, value], index) => {
            if(key!="userName" && key!="userPass")
            {
               questions.push(key);
               everyAnswers.push(value);
            }
        });
        
        questions.forEach(async (element,index) => {
            var questionExists=await db.query(`SELECT question_id FROM user_answers WHERE question_id=(SELECT question_id FROM questions WHERE question=$1)`,[element]);
            if(questionExists.rowCount==0){
                questionNum++;
                console.log("num"+questionNum);
                var mainQuery=await db.query(`INSERT INTO user_answers(user_id,question_id,answers)
                VALUES((SELECT user_id FROM users WHERE username=$1),
                (SELECT question_id FROM questions WHERE question=$2),
                (SELECT options_id FROM options WHERE option=$3))`,[userName,element,everyAnswers[index]]);
                // console.log(mainQuery);
            }else{
                console.log("questionExists");
                questionBool = false;
            }
        });
        questions.forEach(async function(element,index,array){
            var answerCheck = await db.query((`SELECT option FROM options WHERE 
            options_id=(SELECT rightoptions FROM questions where question=$1)`),[element]);
            // console.log(answerCheck);
            if(answerCheck.rows[0].option==everyAnswers[index]){
                rightAnswerNum++;
                console.log("right"+rightAnswerNum);
            }
            if(Object.is(array.length -1 ,index)){

                console.log("num outside "+questionNum);
                console.log("right outside "+rightAnswerNum);
                const total=await ( rightAnswerNum/questionNum)*100;
                if(total>35){
                    ifPass=true;
                }else{
                    ifPass=false;
                }
                if(questionBool){
                    var now =new Date();
                    var examEntry=await db.query((`INSERT INTO 
                    exam(username,dateofexam,result_pass,exam_score,no_of_question)
                    VALUES((SELECT username FROM users WHERE username=$1),$2,$3,$4,$5)`),[userName,now,ifPass,rightAnswerNum,questionNum]);
                }
            }
        });
      
        
        // console.log("num outside "+questionNum);
        // console.log("right outside "+rightAnswerNum);
        // const total=await ( rightAnswerNum/questionNum)*100;
        // if(total>35){
        //     ifPass=true;
        // }else{
        //     ifPass=false;
        // }
        // if(questionBool){
        //     var now =new Date();
        //     var examEntry=await db.query((`INSERT INTO 
        //         exam(username,dateofexam,result_pass,exam_score,no_of_question)
        //         VALUES((SELECT username FROM users WHERE username=$1),$2,$3,$4,$5)`),[userName,now,ifPass,rightAnswerNum,questionNum]);
        // }
        
    


       

        res.send("Answers obtained");
    }catch(err){
        console.log(err);
    }
});

app.listen(port,function(){
    console.log(`express is working on ${port}`);
});