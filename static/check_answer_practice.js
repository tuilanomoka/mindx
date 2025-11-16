function check_answer_practice()
{
    try {
        // TODO: Check result and display steps
    } catch (error) {
        // ERRROR handling
    }
}
function confirm_practice()
{
    var Question = document.getElementById("question").value;
    fetch('/ask_ai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "question":Question
        })
    })
    .then(response => response.json())
    .then(data => {
        if(data.success)
        {
            window.AnswerData = data.content[0];
            //TODO: show the submit answer field
            /*var result_field = document.getElementById("result_field");
            var data = data.content[0];
            console.log(data);
            data["Buoc"].forEach(element => {
                // handling data
                const newElement = document.createElement('div');
                const newElementStep = "Bước " + element["Buoc"];
                const newElementTitle = "Tiêu đề: " + element["TieuDe"];
                const newElementDesc = element["MoTa"];
                newElement.innerText = newElementStep + "\n"+ newElementTitle +"\n"+ newElementDesc;
                result_field.appendChild(newElement);
            });
                const newElement = document.createElement('div');
                const newElementTitle = "Đáp án: " + data["DapAn"]['KetQua'];
                newElement.innerText = newElementTitle;
                result_field.appendChild(newElement);*/
        }else{
            // error
            alert("Có lỗi xảy ra!, " + data.content);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Có lỗi xảy ra khi xây dựng lên nội dung!');
    });
}