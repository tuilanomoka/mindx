function check_login()
{
    const username = "{{ username|default('') }}"; 

    if (username) {
        navigateToChat();
    }
}