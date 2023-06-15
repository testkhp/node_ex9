const express = require("express");
const MongoClient = require("mongodb").MongoClient;
//데이터베이스의 데이터 입력,출력을 위한 함수명령어 불러들이는 작업
const app = express();
const port = 3000;

//ejs 태그를 사용하기 위한 세팅
app.set("view engine","ejs");
//사용자가 입력한 데이터값을 주소로 통해서 전달되는 것을 변환(parsing)
app.use(express.urlencoded({extended: true}));
app.use(express.json()) 
//css/img/js(정적인 파일)사용하려면 이코드를 작성!
app.use(express.static('public'));


let db; //데이터베이스 연결을 위한 변수세팅(변수의 이름은 자유롭게 지어도 됨)

MongoClient.connect("mongodb+srv://khp2337:cogktkfkd8214@cluster0.kjr1egt.mongodb.net/?retryWrites=true&w=majority",function(err,result){
    //에러가 발생했을경우 메세지 출력(선택사항)
    if(err) { return console.log(err); }

    //위에서 만든 db변수에 최종연결 ()안에는 mongodb atlas 사이트에서 생성한 데이터베이스 이름
    db = result.db("board_final");

    //db연결이 제대로 됬다면 서버실행
    app.listen(port,function(){
        console.log("서버연결 성공");
    });

});

app.get("/",function(req,res){
    res.render("index.ejs");
});

//게시글 목록 페이지
app.get("/board/list",(req,res)=>{
   
    db.collection("board").find().toArray((err,total)=>{

       
        //게시글 전체 갯수 알아내기
        let totalData = total.length;
        console.log("전체게시글 갯수" + totalData);
   
        //한 페이지에 보여줄 게시글 갯수
        let perPage = 3;

        //게시글 전체 갯수를 토대로 페이지 번호가 총 몇개가 만들어져서 표시되야하는지? 
        let totalPaging = Math.ceil(totalData / perPage)

        //웹브라우저 주소창에 몇번 페이지 번호로 접속했는지 체크  page=1 / 
        let pageNumber = (req.query.page == null) ? 1 : Number(req.query.page)
        console.log("현재 보고있는 페이징번호" + pageNumber)
     
        //블록당 보여줄 페이지 번호 갯수
        let blockCount = 5;
        //이전,다음 블록간 이동을 하기위한 현재 페이지 블록을 구해보기
        let blockNum = Math.ceil(pageNumber / blockCount)
        console.log("내가보고있는 페이지는 몇번블록에 있나요?" + blockNum)
        //블록안에 페이지 번호 시작값 알아내기 1,2,3,4,5에서 1번
        let blockStart = ((blockNum - 1) * blockCount) + 1;
        console.log(blockNum + "번째에 시작하는 페이지번호는?" + blockStart)
        //블록안에 페이지 번호 끝 값 알아내기 1,2,3,4,5에서 5번
        let blockEnd = blockStart + blockCount - 1
        console.log(blockNum + "번째에 끝나는 페이지번호는?" + blockEnd)
        


        //블록(그룹)에서 마지막 페이지번호가 끝번호보다 크다면 페이지의 끝번호를 강제로 고정
        if(blockEnd > totalPaging){
            blockEnd = totalPaging; 
            // page=10   ->    끝번호는 7로 고정 (잘못된 페이지 접근을 막으려고)
        }

        //블록(그룹)의 총갯수값 구하기
        let totalBlock = Math.ceil(totalPaging / blockCount)

        //데이터베이스에서 3개씩 게시글을 뽑아서 가지고 오기위한 순서값을 정해줌
        let startFrom = (pageNumber - 1) * perPage

        //데이터베이스에서 find명령어로 꺼내오는 작업을 진행!
        
        db.collection("board").find().sort({num:-1}).skip(startFrom).limit(perPage).toArray((err,result)=>{
            
            if(req.query.page === "" || req.query.page > totalPaging){
                res.send("잘못된 페이지 접근입니다.")
                //send 대신 res.redirect 로 원하는 경로로 이동시킬 수 있음
            }
            else{

            res.render("brd_list.ejs",{

                data:result, //find로 찾아온 게시글 데이터들 3개 보내줌
                totalPaging:totalPaging, // 페이지 번호 총갯수값 -> 7개
                blockStart:blockStart, //블록안에 페이지 시작번호값
                blockEnd:blockEnd, //블록안에 페이지 끝번호값
                blockNum:blockNum, //보고있는 페이지번호가 몇번 블록(그룹)에 있는지 확인
                totalBlock:totalBlock, //블록(그룹)의 총갯수값 -> 2개
                pageNumber:pageNumber //현재 보고있는 페이지 번호값
            })
          }
        })
    })
})


//게시글 작성화면 페이지
app.get("/board/insert",(req,res)=>{
    res.render("brd_insert.ejs");
})


//게시글 데이터베이스에 저장
                
app.post("/dbupload",(req,res)=>{
   
    db.collection("count").findOne({name:"상품갯수"},(err,countResult)=>{
        db.collection("board").insertOne({
            num:countResult.prdCount,
            title:req.body.title,
            author:req.body.author,
            content:req.body.content
        },(err,result)=>{
            db.collection("count").updateOne({name:"상품갯수"},{$inc:{prdCount:1}},(err,result)=>{
                res.redirect(`/board/detail/${countResult.prdCount}`)
            })
        })
    })
})


//게시글 상세화면페이지
app.get("/board/detail/:num",(req,res)=>{
    

    db.collection("board").findOne({num:Number(req.params.num)},(err,result)=>{
        res.render("brd_detail.ejs",{data:result});
    })
})


//게시글 수정화면 페이지 요청
app.get("/board/update/:num",(req,res)=>{
    db.collection("board").findOne({num:Number(req.params.num)},(err,result)=>{

        res.render("brd_update.ejs",{data:result});
    })
})


//게시글 데이터베이스에 수정처리
app.post("/dbupdate",(req,res)=>{
   
    db.collection("board").updateOne({num:Number(req.body.num)},{$set:{title:req.body.title,author:req.body.author,content:req.body.content}},(err,result)=>{
        res.redirect(`/board/detail/${req.body.num}`) 
    })
})










