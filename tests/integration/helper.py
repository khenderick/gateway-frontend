import requests
from time import time, sleep

OM_TESTEE_AUTHORIZED_OUTPUT_ID = 13
OM_TESTER_USERNAME = os.environ['OM_TESTEE_USERNAME']
OM_TESTER_PASSWORD = os.environ['OM_TESTEE_PASSWORD']

class Helper(object):

    def __init__(self, testee_ip, tester_ip, global_timeout):
        self.testee_ip = testee_ip
        self.tester_ip = tester_ip
        self.global_timeout = global_timeout

    @staticmethod
    def find_element_where(locator, driver):
        locator_type, locator_value = locator.split('=')
        if locator_type == 'id':
            return driver.find_element_by_id(locator_value)
        elif locator_type == 'class':
            return driver.find_element_by_class_name(locator_value)
        elif locator_type == 'css':
            return driver.find_element_by_css_selector(locator_value)
        elif locator_type == 'link':
            return driver.find_element_by_link_text(locator_value)
        elif locator_type == 'name':
            return driver.find_element_by_name(locator_value)
        elif locator_type == 'plink':
            return driver.find_element_by_partial_link_text(locator_value)
        elif locator_type == 'tag':
            return driver.find_element_by_tag_name(locator_value)
        elif locator_type == 'xpath':
            return driver.find_element_by_xpath(locator_value)
        else:
            raise Exception('Invalid locator given!')

    def test_platform_caller(self, api, params=None, token=None, is_testee=False, expected_failure=False):
        """
        Used to call APIs on the Tester
        :param api: URI to the target API on the Testee
        :type api: str
        :param params: A dict of parameters
        :type params: dict
        :param token: A valid token of a logged in user on the Testee
        :type token: str
        :param is_testee: Indicates if the target is the Testee or not (tester otherwise)
        :type is_testee: bool
        :param expected_failure: Indicates if we expected a payload with success: False
        :type expected_failure: bool
        :return: API response
        :rtype: dict
        """
        header = None
        uri = 'https://{0}/{1}'.format(self.tester_ip if not is_testee else self.testee_ip, api)
        if token:
            header = {'Authorization': 'Bearer {0}'.format(token)}
        start = time()
        while time() - start <= self.global_timeout:
            if not header:
                response = requests.get(uri, verify=False, params=params or {})
            else:
                response = requests.get(uri, verify=False, headers=header, params=params or {})
            if expected_failure is False:
                if response is None or response.json() is False:
                    sleep(0.3)
                    continue
            else:
                if response is None:
                    sleep(0.3)
                    continue
            return response.json()

    def enter_testee_authorized_mode(self, token, timeout=None):
        """
        Enters authorized mode on the Testee via toggling the output on the Tester.

        :param timeout: Duration in seconds of the output toggling.
        :type timeout: int

        :param token: Authorization token
        :return: Enters authorized mode on the Testee
        """
        if timeout is None:
            timeout = 10
        start = time()

        self.test_platform_caller(api='set_output', params={"id": OM_TESTEE_AUTHORIZED_OUTPUT_ID, "is_on": True}, token=token)
        while time() - start < timeout:
            if self.test_platform_caller(api='get_usernames').get('success', False) is True:
                self.test_platform_caller(api='set_output', params={"id": OM_TESTEE_AUTHORIZED_OUTPUT_ID, "is_on": False}, token=token)
                sleep(0.3)
                self.test_platform_caller(api='set_output', params={"id": OM_TESTEE_AUTHORIZED_OUTPUT_ID, "is_on": True}, token=token)
                sleep(0.3)
                self.test_platform_caller(api='set_output', params={"id": OM_TESTEE_AUTHORIZED_OUTPUT_ID, "is_on": False}, token=token)
                return True
            sleep(0.3)           
        self.test_platform_caller(api='set_output', params={"id": output_id, "is_on": False}, token=token)
        return False

    def get_new_tester_token(self):
        params = {'username': OM_TESTER_USERNAME, 'password': OM_TESTER_PASSWORD, 'accept_terms': True}
        return self.test_platform_caller(api='login', params=params).get('token')
