from setuptools import find_packages,setup
from typing import List

def get_requirements()->List[str]:
    requirement_list:list[str]=[]
    try:
        with open('requirements.txt','r') as file:
            lines=file.readlines()
            for line in lines:
                requirement=line.strip()
                if requirement and requirement!="-e.":
                    requirement_list.append(requirement)
    except FileNotFoundError:
        print("requirements.txt file not found")
    return requirement_list

setup(
    name='NetworkSecurity',
    version='0.0.1',
    author='mdzaheerjk',
    author_email='zaheerjkxai@gmail.com',
    packages=find_packages(),
    install_requires=get_requirements()
)