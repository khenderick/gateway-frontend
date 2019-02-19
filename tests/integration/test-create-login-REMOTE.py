import time
import requests
from selenium import webdriver

#  Currently only compatible with an experimental version of the Frontend that has missing ID attributes

OM_CICD = 'cicd1'
OM_ATK = '5diRUwk1xj5BTV2CzhSK'


def test_create_user_login():
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

    driver.get("https://localhost:8088")
    time.sleep(10)  # Wait for page to finish rendering

    elem = driver.find_element_by_id("login.create")
    elem.click()

    response = requests.get("https://localhost:8089/login?username=openmotics&password=123456", verify=False)
    token = response.json().get('token')
    start = time.time()
    requests.get("https://localhost:8089/set_output?id=13&is_on=true", verify=False,
                 headers={'Authorization': 'Bearer {0}'.format(token)})
    while time.time() - start < 6:
        continue

    requests.get("https://localhost:8089/set_output?id=13&is_on=false", verify=False,
                 headers={'Authorization': 'Bearer {0}'.format(token)})

    assert "OpenMotics" in driver.title
    elem = driver.find_element_by_id("create.username")
    elem.send_keys("automatedusername")

    elem = driver.find_element_by_id("create.password")
    elem.send_keys("automatedpassword")

    elem = driver.find_element_by_id("create.confirmpassword")
    elem.send_keys("automatedpassword")

    elem = driver.find_element_by_id("create.create")
    elem.click()

    time.sleep(5)

    elem = driver.find_element_by_id("create.havelogin")
    elem.click()

    elem = driver.find_element_by_id("login.username")
    elem.send_keys("automatedusername")

    elem = driver.find_element_by_id("login.password")
    elem.send_keys("automatedpassword")

    elem = driver.find_element_by_id("login.signin")
    elem.click()

    elem = driver.find_element_by_id("login.acceptterms")
    elem.click()

    elem = driver.find_element_by_id("login.signin")
    elem.click()

    time.sleep(5)

    print driver.title

    # This is where you tell Browser Stack to stop running tests on your behalf.
    # It's important so that you aren't billed after your test finishes.
    driver.quit()
