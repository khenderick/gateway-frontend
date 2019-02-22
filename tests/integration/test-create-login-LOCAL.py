from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from helper import Helper

#  Currently only compatible with an experimental version of the Frontend that has missing ID attributes


def __init__(self, url):
    self.url = url


def test_the_title_is_openmotics():
    my_helper = Helper('10.91.99.52', '10.91.99.73', 10)
    browser_options = Options()
    browser_options.add_argument("--disable-web-security")
    browser = webdriver.Chrome(executable_path="C:\Users\MedMahdi\Downloads\chromedriver_win32\chromedriver", options=browser_options)
    browser.get("https://{0}/".format(my_helper.testee_ip))

    browser.implicitly_wait(my_helper.global_timeout)  # Wait for page to finish rendering
    elem = browser.find_element_where("id=login.create")
    elem.click()

    token = my_helper.get_new_tester_token('openmotics', '123456')

    my_helper.test_platform_caller('set_output?id=13&is_on=true', token)

    my_helper.test_platform_caller('get_usernames', is_testee=True)

    my_helper.test_platform_caller('set_output?id=13&is_on=false', token)

    if "OpenMotics" not in browser.title:
        raise Exception("Unable to load the page!")

    elem = my_helper.find_element_where('id=create.username', browser)
    elem.send_keys("automatedusername")

    elem = my_helper.find_element_where('id=create.password', browser)
    elem.send_keys("automatedpassword")

    elem = my_helper.find_element_where('id=create.confirmpassword', browser)
    elem.send_keys("automatedpassword")

    elem = my_helper.find_element_where('id=create.create', browser)
    elem.click()

    elem = my_helper.find_element_where('id=create.havelogin', browser)
    elem.click()

    elem = my_helper.find_element_where('id=login.username', browser)
    elem.send_keys("automatedusername")

    elem = my_helper.find_element_where('id=login.password', browser)
    elem.send_keys("automatedpassword")

    elem = my_helper.find_element_where('id=login.signin', browser)
    elem.click()

    elem = my_helper.find_element_where('id=login.acceptterms', browser)
    elem.click()

    elem = my_helper.find_element_where('id=login.signin', browser)
    elem.click()

    assert "OpenMotics" in browser.title
