import time

def execute(input_params, socket_comm):
    """
    It keeps the script running for the given time
    :param dict input_params: Input parameters object
    :param socket_comm: Socket communication object
    :return: Execution result object
    :rtype: dict
    """
    time.sleep(input_params['Milliseconds'] / 1000)
    return {'success': True}
