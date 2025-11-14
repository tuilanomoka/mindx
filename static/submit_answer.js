function submit_answer()
{
    var Question = document.getElementById("field").value;
    //submit the question to server
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
        alert(data);
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Có lỗi xảy ra khi xây dựng lên nội dung!');
    });
}