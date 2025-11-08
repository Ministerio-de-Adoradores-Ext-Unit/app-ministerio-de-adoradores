import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ListItem = ({
    title,
    content,
    hasContent = false,
    defaultExpanded = false,
    isDark = false, 
    onPress
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);

    const toggleExpand = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(prev => !prev);
        if (onPress) {
            onPress();
        }
    }, [onPress]);

    
    const ADM_BLUE_STRONG = '#072e55ff';

    const backgroundColor = isDark ? ADM_BLUE_STRONG : '#FFF';
    const titleColor = isDark ? '#FFF' : '#333';
    const contentBackgroundColor = isDark ? ADM_BLUE_STRONG : '#F5F5F5';

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={[styles.header, { backgroundColor, borderColor: isDark ? '#4A647A' : '#E0E0E0' }]} 
                onPress={hasContent ? toggleExpand : onPress}
                activeOpacity={0.8}
            >
                <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
                    {title}
                </Text>

                {hasContent && (
                    <Icon
                        name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={24}
                        color={titleColor}
                        style={styles.icon}
                    />
                )}
            </TouchableOpacity>

            {expanded && hasContent && (
                <View style={[styles.content, { backgroundColor: contentBackgroundColor }]}>
                    <View style={styles.contentPadding}>
                        {content}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    icon: {
        marginLeft: 10,
    },
    content: {
        overflow: 'hidden', 
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        borderTopWidth: 0,
    },
    contentPadding: {
        padding: 15,
    },
});