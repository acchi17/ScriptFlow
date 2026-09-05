def execute(input_params):
    result = {'success': False}
    try:
        result['Result'] = input_params['NumberA'] + input_params['NumberB']
        result['success'] = True
    except Exception as error:
        result['errorMessage'] = str(error)
    return result
