import time
import requests
from selenium import webdriver
from helper import Helper

#  Currently only compatible with an experimental version of the Frontend that has missing ID attributes

OM_CICD = 'cicd1'
OM_ATK = '5diRUwk1xj5BTV2CzhSK'


def test_the_title_is_openmotics():
    my_helper = Helper('localhost:8088', 'localhost:8089', 10)
    desired_cap = {
        'os': 'Windows',
        'os_version': '10',
        'browser': 'Chrome',
        'browser_version': '70.0',
        'project': 'LocalUpdated',
        'build': 'Build 1.0',
        'browserstack.debug': 'true',
        'browserstack.local': 'true',
        'browserstack.selenium_version': '3.14.0',
        'browserstack.chrome.driver': '2.43'
    }

    driver = webdriver.Remote(
        command_executor='http://{0}:{1}@hub.browserstack.com:80/wd/hub'.format(OM_CICD, OM_ATK),
        desired_capabilities=desired_cap)

    driver.get("https://{0}/".format(my_helper.testee_ip))
    driver.implicitly_wait(my_helper.global_timeout)  # Wait for page to finish rendering

    elem = my_helper.find_element_where("id=login.create", driver)
    elem.click()

    response = requests.get("https://{0}/login?username=openmotics&password=123456".format(my_helper.tester_ip), verify=False)
    token = response.json().get('token')
    start = time.time()
    requests.get("https://{0}/login?username=openmotics&password=123456".format(my_helper.tester_ip), verify=False, headers={'Authorization': 'Bearer {0}'.format(token)})
    while time.time() - start <= 6:
        continue

    requests.get("https://{0}}/set_output?id=13&is_on=false".format(my_helper.tester_ip), verify=False, headers={'Authorization': 'Bearer {0}'.format(token)})

    assert "OpenMotics" in driver.title
    elem = my_helper.find_element_where('id=create.username', driver)
    elem.send_keys("automatedusername")

    elem = my_helper.find_element_where('id=create.password', driver)
    elem.send_keys("automatedpassword")

    elem = my_helper.find_element_where('id=create.confirmpassword', driver)
    elem.send_keys("automatedpassword")

    elem = my_helper.find_element_where('id=create.create', driver)
    elem.click()

    elem = my_helper.find_element_where('id=create.havelogin', driver)
    elem.click()

    elem = my_helper.find_element_where('id=login.username', driver)
    elem.send_keys("automatedusername")

    elem = my_helper.find_element_where('id=login.password', driver)
    elem.send_keys("automatedpassword")

    elem = my_helper.find_element_where('id=login.signin', driver)
    elem.click()

    elem = my_helper.find_element_where('id=login.acceptterms', driver)
    elem.click()

    elem = my_helper.find_element_where('id=login.signin', driver)
    elem.click()

    time.sleep(5)

    print driver.title

    # This is where you tell Browser Stack to stop running tests on your behalf.
    # It's important so that you aren't billed after your test finishes.
    driver.quit()
