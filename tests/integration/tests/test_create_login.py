import time
import os
import unittest
from helper import Helper

OM_CICD = 'cicd1'
OM_TESTER_USERNAME = os.environ['OM_TESTEE_USERNAME']
OM_TESTER_PASSWORD = os.environ['OM_TESTEE_PASSWORD']
OM_TESTEE_AUTHORIZED_OUTPUT_ID = 13


class TestCreateLogin(unittest.TestCase):
    driver = None

    def test_the_title_is_openmotics(self):
        my_helper = Helper(testee_ip='localhost:8088', tester_ip='localhost:8089', global_timeout=10)

        self.driver.get("https://{0}/".format(my_helper.testee_ip))
        self.driver.implicitly_wait(my_helper.global_timeout)  # Wait for page to finish rendering

        elem = my_helper.find_element_where("id=login.create", self.driver)
        elem.click()

        token = my_helper.get_new_tester_token(OM_TESTER_USERNAME, OM_TESTER_PASSWORD)

        in_authorized_mode = my_helper.test_platform_caller(api='get_usernames', is_testee=True)

        try:
            if not in_authorized_mode.get('success'):
                params = {'id': OM_TESTEE_AUTHORIZED_OUTPUT_ID, 'is_on': True}
                my_helper.test_platform_caller(api='set_output', params=params, token=token)
                time.sleep(6.5)

                params = {'id': OM_TESTEE_AUTHORIZED_OUTPUT_ID, 'is_on': False}
                my_helper.test_platform_caller(api='set_output', params=params, token=token)
        except Exception as ex:
            self.fail('failed to enter authorized mode: {0}'.format(ex))

        self.assertTrue("OpenMotics" in self.driver.title, 'Should contain OpenMotics in the page title.')
        elem = my_helper.find_element_where('id=create.username', self.driver)
        elem.send_keys("automatedusername")

        elem = my_helper.find_element_where('id=create.password', self.driver)
        elem.send_keys("automatedpassword")

        elem = my_helper.find_element_where('id=create.confirmpassword', self.driver)
        elem.send_keys("automatedpassword")

        elem = my_helper.find_element_where('id=create.create', self.driver)
        elem.click()

        elem = my_helper.find_element_where('id=create.havelogin', self.driver)
        elem.click()

        elem = my_helper.find_element_where('id=login.username', self.driver)
        elem.send_keys("automatedusername")

        elem = my_helper.find_element_where('id=login.password', self.driver)
        elem.send_keys("automatedpassword")

        elem = my_helper.find_element_where('id=login.signin', self.driver)
        elem.click()

        elem = my_helper.find_element_where('id=login.acceptterms', self.driver)
        elem.click()

        elem = my_helper.find_element_where('id=login.signin', self.driver)
        elem.click()

        self.driver.implicitly_wait(my_helper.global_timeout)  # Wait for page to finish rendering

        self.assertTrue("OpenMotics" in self.driver.title, 'Should still contain OpenMotics in the page title.')

        self.driver.quit()
